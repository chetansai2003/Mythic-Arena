import { createServer } from 'node:http';
import { createDependencies, createLogger } from '@mythic/shared/server';
import { createGameService } from '../../backend/src/services/realtime/gameService.js';
import { attachSocketServer } from '../../backend/src/sockets/socketServer.js';
import { startGameWorker } from '../../backend/src/workers/src/gameWorker.js';

const config = JSON.parse(process.env.MYTHIC_FAULT_CONFIG);
if (!config.MONGODB_DB.startsWith('mythic_online_test_'))
  throw new Error('Isolated test database required');
const logger = createLogger('fault-process', 'silent');
const dependencies = createDependencies(config, logger);
dependencies.start();
await dependencies.mongo.connect();
const stopAtCommit = async () => {
  process.send({ event: 'committed' });
  await new Promise(() => {});
};
const games = createGameService({
  dependencies,
  config,
  now: () => Number(process.env.MYTHIC_FAULT_TIME),
  ...(process.env.MYTHIC_FAULT_ROLE === 'persist'
    ? { afterPersist: stopAtCommit }
    : {}),
});
if (process.env.MYTHIC_FAULT_ROLE === 'api') {
  const server = createServer();
  attachSocketServer({
    server,
    config,
    services: {
      games,
      auth: {
        authenticate: async (authorization) => {
          const id = authorization.replace('Bearer ', '');
          if (!['alpha', 'beta'].includes(id))
            throw new Error('Invalid test identity');
          return {
            user: { id, displayName: id },
            familyId: id,
            expiresAt: Date.now() + 60000,
          };
        },
      },
    },
    beforeBroadcast: stopAtCommit,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.send({ event: 'ready', port: server.address().port });
} else if (process.env.MYTHIC_FAULT_ROLE === 'persist') {
  await games.persist(process.env.MYTHIC_FAULT_GAME);
} else {
  startGameWorker(games, logger);
  process.send({ event: 'ready' });
}
