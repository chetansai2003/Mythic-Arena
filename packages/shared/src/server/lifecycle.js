import { createServer } from 'node:http';
import { createDependencies } from './dependencies.js';

export async function startService({
  config,
  logger,
  handlerFactory,
  port,
  configureServer,
}) {
  const lifecycle = { shuttingDown: false };
  const dependencies = createDependencies(config, logger);
  dependencies.start();
  let handler;
  try {
    handler = await handlerFactory({ dependencies, lifecycle });
  } catch (error) {
    await dependencies.close();
    throw error;
  }
  const server = createServer(handler);
  const cleanup = await configureServer?.({ server, dependencies, lifecycle });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, config.HOST, resolve);
  }).catch(async (error) => {
    await dependencies.close();
    throw error;
  });
  logger.info({ port }, 'Service listening');
  let closing;
  const shutdown = () => {
    if (closing) return closing;
    lifecycle.shuttingDown = true;
    closing = (async () => {
      const deadline = setTimeout(() => {
        logger.error('Shutdown deadline exceeded');
        process.exit(1);
      }, 5000);
      try {
        await cleanup?.();
        await new Promise((resolve) => {
          server.close(resolve);
          server.closeIdleConnections();
        });
        await dependencies.close();
        logger.info('Service stopped');
      } finally {
        clearTimeout(deadline);
      }
    })();
    return closing;
  };
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      void shutdown();
    });
  return { server, dependencies, shutdown };
}
