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
import { createGameService } from '../services/realtime/gameService.js';
import { setupDatabase } from '../models/database.js';

export async function createApiServices({
  config,
  dependencies,
  logger = console,
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
  const games = createGameService({ dependencies, config, deckService, now });
  const cookies = createCookieSecurity(config, now);
  const limit = createRateLimit(dependencies.redis, config.RATE_LIMIT_PREFIX);
  const router = Router();
  let settingUp = null;
  async function isReady() {
    try {
      const meta = await db.collection('metadata').findOne({ _id: 'schema' });
      if (meta?.version === 3) return true;
      if (!settingUp) {
        settingUp = setupDatabase(db)
          .catch((err) => {
            (logger.warn ? logger.warn({ err: err.message }, 'Database auto-initialization failed') : console.warn('Database auto-initialization failed:', err.message));
            throw err;
          })
          .finally(() => {
            settingUp = null;
          });
      }
      await settingUp;
      const updated = await db.collection('metadata').findOne({ _id: 'schema' });
      return updated?.version === 3;
    } catch {
      return false;
    }
  }
  void isReady();
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
  router.get('/matches', requireAuth, async (req, res) =>
    res.json({ matches: await games.history(req.auth.user.id) }),
  );
  router.get('/leaderboard', async (_req, res) =>
    res.json({
      players: (
        await db
          .collection('users')
          .find(
            { wins: { $gt: 0 } },
            { projection: { displayName: 1, wins: 1 } },
          )
          .sort({ wins: -1, displayName: 1, _id: 1 })
          .limit(50)
          .toArray()
      ).map((p) => ({ id: p._id, displayName: p.displayName, wins: p.wins })),
    }),
  );
  return { router, isReady, auth, deckService, games };
}
