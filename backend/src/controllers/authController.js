import { loginSchema, registerSchema } from '@mythic/shared';
import { parseInput } from '../utils/errors.js';

export function createAuthController(auth, cookies) {
  function sendSession(res, result, status = 200) {
    cookies.setRefresh(res, result.refreshToken, result.refreshExpiresAt);
    return res.status(status).json({
      user: result.user,
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
    });
  }
  return {
    csrf: (req, res) => res.json({ csrfToken: cookies.csrf(req, res) }),
    register: async (req, res) =>
      sendSession(
        res,
        await auth.register(parseInput(registerSchema, req.body)),
        201,
      ),
    login: async (req, res) =>
      sendSession(res, await auth.login(parseInput(loginSchema, req.body))),
    refresh: async (req, res, next) => {
      try {
        sendSession(res, await auth.refresh(cookies.getRefresh(req)));
      } catch (error) {
        if (error.status === 401) cookies.clear(res);
        next(error);
      }
    },
    logout: async (req, res) => {
      await auth.logout(cookies.getRefresh(req), req.headers.authorization);
      cookies.clear(res);
      res.sendStatus(204);
    },
    me: (req, res) => res.json({ user: req.auth.user }),
  };
}
