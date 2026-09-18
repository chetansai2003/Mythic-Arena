import { createLogger, startService } from '@mythic/shared/server';
import { createApp } from './app.js';
import { parseApiConfig } from './config/env.js';
import { createApiServices } from './routes/index.js';
import { attachSocketServer } from './sockets/socketServer.js';

try {
  const config = parseApiConfig(process.env);
  const logger = createLogger('api', config.LOG_LEVEL);
  let services;
  let sockets;
  await startService({
    config,
    logger,
    port: config.API_PORT,
    handlerFactory: async (context) => {
      services = await createApiServices({
        config,
        dependencies: context.dependencies,
        onSessionRevoked: (familyId) => sockets?.revoke(familyId),
      });
      return createApp({
        ...context,
        config,
        logger,
        services,
      });
    },
    configureServer: ({ server }) => {
      sockets = attachSocketServer({ server, config, services });
      return () => sockets.close();
    },
  });
} catch (error) {
  if (error.message.startsWith('Invalid environment fields:'))
    console.error(error.message);
  else if (error.code === 'EADDRINUSE')
    console.error(
      `API startup failed: ${error.address ?? 'configured host'}:${error.port} is already in use. Stop the existing API process or choose another API_PORT.`,
    );
  else console.error(`API startup failed: ${error.message}`);
  process.exitCode = 1;
}
