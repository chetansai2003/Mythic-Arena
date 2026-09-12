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
  console.error(
    error.message.startsWith('Invalid environment fields:')
      ? error.message
      : 'Worker startup failed; check service configuration and port availability',
  );
  process.exitCode = 1;
}
