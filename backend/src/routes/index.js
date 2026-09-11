import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { createAuthRoutes } from './authRoutes.js';
import { createDeckRoutes } from './deckRoutes.js';
import { createCardRoutes } from './cardRoutes.js';
import { Router } from 'express';
import { createAuthService } from '../services/authService.js';
import {
  createCookieSecurity,
  createRateLimit,
} from '../middleware/security.js';
import { createDeckService } from '../services/deckService.js';
import { HttpError } from '../utils/errors.js';

export async function createApiServices({
  config,
  dependencies,
  now = Date.now,
  onSessionRevoked,
}) {
  const db = dependencies.mongo.db(config.MONGODB_DB);
  const auth = await createAuthService({
    db,
    mongo: dependencies.mongo,
    config,
    now,
    onSessionRevoked,
  });
  const deckService = createDeckService(db, now);
  const cookies = createCookieSecurity(config, now);
  const limit = createRateLimit(dependencies.redis, config.RATE_LIMIT_PREFIX);
  const router = Router();
  async function isReady() {
    try {
      return (
        (await db.collection('metadata').findOne({ _id: 'schema' }))
          ?.version === 2
      );
    } catch {
      return false;
    }
  }
  router.use(async (_req, _res, next) => {
    if (!(await isReady()))
      return next(
        new HttpError(
          503,
          'DEPENDENCY_UNAVAILABLE',
          'Account and card services are temporarily unavailable.',
        ),
      );
    next();
  });
  const requireAuth = createAuthMiddleware(auth);
  router.use('/auth', createAuthRoutes({ auth, cookies, limit, requireAuth }));
  router.use('/cards', createCardRoutes(deckService));
  router.use('/decks', createDeckRoutes({ deckService, cookies, requireAuth }));
  return { router, isReady, auth, deckService };
}
