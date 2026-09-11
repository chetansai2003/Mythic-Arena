import { Router } from 'express';
import { registerSchema, loginSchema, deckCreateSchema, deckUpdateSchema, deckDeleteSchema, idSchema } from '@mythic/shared';
import { ENGINE_READY } from '@mythic/game-engine';
import { createAuthService } from './auth/service.js';
import { createCookieSecurity, createRateLimit } from './auth/security.js';
import { createDeckService } from './decks/service.js';
import { HttpError, parseInput } from './errors.js';

export async function createApiServices({ config, dependencies, now = Date.now, onSessionRevoked }) {
  const db = dependencies.mongo.db(config.MONGODB_DB);
  const auth = await createAuthService({ db, mongo: dependencies.mongo, config, now, onSessionRevoked });
  const deckService = createDeckService(db, now); const cookies = createCookieSecurity(config, now);
  const limit = createRateLimit(dependencies.redis, config.RATE_LIMIT_PREFIX);
  const router = Router();
  async function isReady() { try { return (await db.collection('metadata').findOne({ _id: 'schema' }))?.version === 2; } catch { return false; } }
  router.use(async (_req, _res, next) => { if (!await isReady()) return next(new HttpError(503, 'DEPENDENCY_UNAVAILABLE', 'Account and card services are temporarily unavailable.')); next(); });
  const requireAuth = async (req, _res, next) => { try { req.auth = await auth.authenticate(req.headers.authorization); next(); } catch (error) { next(error); } };
  const sendSession = (res, result, status = 200) => { cookies.setRefresh(res, result.refreshToken, result.refreshExpiresAt); return res.status(status).json({ user: result.user, accessToken: result.accessToken, expiresAt: result.expiresAt }); };
  router.get('/auth/csrf', limit('csrf', 120), (req, res) => res.json({ csrfToken: cookies.csrf(req, res) }));
  router.post('/auth/register', limit('register', 10), cookies.requireCsrf, async (req, res) => sendSession(res, await auth.register(parseInput(registerSchema, req.body)), 201));
  router.post('/auth/login', limit('login-ip', 15), limit('login-email', 8, (req) => typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''), cookies.requireCsrf, async (req, res) => sendSession(res, await auth.login(parseInput(loginSchema, req.body))));
  router.post('/auth/refresh', limit('refresh', 120), cookies.requireCsrf, async (req, res, next) => {
    try { sendSession(res, await auth.refresh(cookies.getRefresh(req))); }
    catch (error) { if (error.status === 401) cookies.clear(res); next(error); }
  });
  router.post('/auth/logout', cookies.requireCsrf, async (req, res) => { await auth.logout(cookies.getRefresh(req)); cookies.clear(res); res.sendStatus(204); });
  router.get('/auth/me', requireAuth, (req, res) => res.json({ user: req.auth.user }));
  router.get('/cards', async (_req, res) => res.json({ rulesVersion: '1', catalogVersion: 1, cards: (await deckService.catalog()).map((definition) => ({ definition, playable: ENGINE_READY, unavailableReason: ENGINE_READY ? null : 'Battles will be available when the game engine launches.' })) }));
  router.get('/decks', requireAuth, async (req, res) => res.json({ decks: await deckService.list(req.auth.user.id) }));
  router.post('/decks', requireAuth, cookies.requireCsrf, async (req, res) => res.status(201).json({ deck: await deckService.create(req.auth.user.id, parseInput(deckCreateSchema, req.body)) }));
  router.patch('/decks/:id', requireAuth, cookies.requireCsrf, async (req, res) => res.json({ deck: await deckService.update(req.auth.user.id, parseInput(idSchema, req.params.id), parseInput(deckUpdateSchema, req.body)) }));
  router.delete('/decks/:id', requireAuth, cookies.requireCsrf, async (req, res) => { await deckService.remove(req.auth.user.id, parseInput(idSchema, req.params.id), parseInput(deckDeleteSchema, req.body).expectedRevision); res.sendStatus(204); });
  return { router, isReady, auth, deckService };
}
