import { createLogger, startService } from '@mythic/shared/server';
import { createApp } from './app.js';
import { parseApiConfig } from './config.js';
import { createApiServices } from './routes.js';

try {
  const config = parseApiConfig(process.env);
  const logger = createLogger('api', config.LOG_LEVEL);
  await startService({
    config,
    logger,
    port: config.API_PORT,
    handlerFactory: async (context) => createApp({ ...context, config, logger, services: await createApiServices({ config, dependencies: context.dependencies }) }),
  });
} catch (error) {
  console.error(
    error.message.startsWith('Invalid environment fields:')
      ? error.message
      : 'API startup failed; check service configuration and port availability',
  );
  process.exitCode = 1;
}
