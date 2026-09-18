import { parseConfig, createLogger, startService } from '@mythic/shared/server';
import { createWorkerHandler } from './app.js';
import { createGameService } from '../../services/realtime/gameService.js';
import { startGameWorker } from './gameWorker.js';

try {
  const config = parseConfig(process.env);
  const logger = createLogger('worker', config.LOG_LEVEL);
  await startService({
    config,
    logger,
    port: config.WORKER_PORT,
    handlerFactory: createWorkerHandler,
    configureServer: ({ dependencies }) =>
      startGameWorker(createGameService({ dependencies, config }), logger),
  });
} catch (error) {
  if (error.message.startsWith('Invalid environment fields:'))
    console.error(error.message);
  else if (error.code === 'EADDRINUSE')
    console.error(
      `Worker startup failed: ${error.address ?? 'configured host'}:${error.port} is already in use. Stop the existing worker process or choose another WORKER_PORT.`,
    );
  else console.error(`Worker startup failed: ${error.message}`);
  process.exitCode = 1;
}
