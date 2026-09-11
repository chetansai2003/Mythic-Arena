import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';

export function createAuthRoutes({ auth, cookies, limit, requireAuth }) {
  const router = Router();
  const controller = createAuthController(auth, cookies);
  router.get('/csrf', limit('csrf', 120), controller.csrf);
  router.post(
    '/register',
    limit('register', 10),
    cookies.requireCsrf,
    controller.register,
  );
  router.post(
    '/login',
    limit('login-ip', 15),
    limit('login-email', 8, (req) =>
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '',
    ),
    cookies.requireCsrf,
    controller.login,
  );
  router.post(
    '/refresh',
    limit('refresh', 120),
    cookies.requireCsrf,
    controller.refresh,
  );
  router.post('/logout', cookies.requireCsrf, controller.logout);
  router.get('/me', requireAuth, controller.me);
  return router;
}
