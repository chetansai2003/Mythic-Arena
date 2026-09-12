import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createLogger, startService } from '@mythic/shared/server';
import { parseApiConfig } from '../backend/src/config/env.js';
import { setupDatabase } from '../backend/src/models/database.js';
import { createApiServices } from '../backend/src/routes/index.js';
import { createApp } from '../backend/src/app.js';
import { attachSocketServer } from '../backend/src/sockets/socketServer.js';
import { startGameWorker } from '../backend/src/workers/src/gameWorker.js';

const runId = process.env.MYTHIC_E2E_RUN_ID;
if (!/^[a-f0-9]{32}$/.test(runId ?? ''))
  throw new Error('A unique E2E run ID is required');
const database = `mythic_e2e_${runId}`;
const config = parseApiConfig({
  NODE_ENV: 'test',
  API_PORT: '3101',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI ||
    'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
  MONGODB_DB: database,
  FRONTEND_ORIGINS: 'http://127.0.0.1:4173',
  AUTH_SECRET: randomBytes(48).toString('hex'),
  RATE_LIMIT_PREFIX: `${database}:`,
  LOG_LEVEL: 'silent',
});
const logger = createLogger('e2e-api', 'silent');
await mkdir('.local', { recursive: true });
await writeFile(
  `.local/e2e-${runId}.json`,
  JSON.stringify({ database, prefix: config.RATE_LIMIT_PREFIX }),
);
let services;
let sockets;
await startService({
  config,
  logger,
  port: config.API_PORT,
  handlerFactory: async ({ dependencies, lifecycle }) => {
    await setupDatabase(dependencies.mongo.db(database));
    services = await createApiServices({
      config,
      dependencies,
      onSessionRevoked: (familyId) => sockets?.revoke(familyId),
    });
    return createApp({ config, dependencies, lifecycle, logger, services });
  },
  configureServer: ({ server }) => {
    sockets = attachSocketServer({ server, config, services });
    const stopWorker = startGameWorker(services.games, logger);
    return async () => {
      await stopWorker();
      await sockets.close();
    };
  },
});
console.log('Isolated browser-test API ready.');
