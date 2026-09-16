import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { HttpError } from './utils/errors.js';

export function createApp({
  config,
  dependencies,
  lifecycle = { shuttingDown: false },
  logger,
  services,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use((req, res, next) => {
    const incoming = req.get('x-request-id');
    req.requestId = /^[a-zA-Z0-9_-]{1,80}$/.test(incoming ?? '')
      ? incoming
      : randomUUID();
    res.set('x-request-id', req.requestId);
    res.on('finish', () =>
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          status: res.statusCode,
        },
        'Request completed',
      ),
    );
    next();
  });
  app.use((req, res, next) => {
    if (
      req.headers.origin &&
      !config.FRONTEND_ORIGINS.includes(req.headers.origin)
    )
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Origin not allowed',
          requestId: req.requestId,
        },
      });
    next();
  });
  app.use(cors({ origin: config.FRONTEND_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health/live', (req, res) =>
    res.json({
      status: 'alive',
      service: 'api',
      version: config.RELEASE_VERSION,
    }),
  );
  app.get('/health/ready', async (req, res) => {
    if (lifecycle.shuttingDown)
      return res.status(503).json({ status: 'not_ready' });
    const status = await dependencies.check();
    const ready =
      status.redis && status.mongo && (!services || (await services.isReady()));
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      service: 'api',
      version: config.RELEASE_VERSION,
      dependencies: status,
    });
  });
  if (services) app.use(services.router);
  app.use((req, res) =>
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        requestId: req.requestId,
      },
    }),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError)
      return res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          requestId: req.requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    const invalid =
      error.type === 'entity.parse.failed' || error.type === 'entity.too.large';
    logger.warn(
      {
        requestId: req.requestId,
        category: invalid ? 'invalid_payload' : 'internal_error',
      },
      'Request rejected',
    );
    const dependencyError = /Mongo|Redis|Socket|ClientClosed/.test(
      error.name ?? '',
    );
    res.status(invalid ? 400 : dependencyError ? 503 : 500).json({
      error: {
        code: invalid
          ? 'INVALID_PAYLOAD'
          : dependencyError
            ? 'DEPENDENCY_UNAVAILABLE'
            : 'INTERNAL_ERROR',
        message: invalid
          ? 'Invalid request body'
          : 'Request could not be completed',
        requestId: req.requestId,
      },
    });
  });
  return app;
}
