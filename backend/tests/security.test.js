import { expect, it } from 'vitest';
import { createCookieSecurity } from '../src/middleware/security.js';
import { parseApiConfig } from '../src/config/env.js';

const config = {
  NODE_ENV: 'production',
  AUTH_SECRET: 'test-only-private-key-'.repeat(3),
  FRONTEND_ORIGINS: ['https://arena.test'],
};
it('sets secure host-only cookies in production and rejects mismatched CSRF', () => {
  const security = createCookieSecurity(config);
  const values = [];
  const res = { append: (_name, value) => values.push(value) };
  security.setRefresh(res, 'opaque-token', new Date(Date.now() + 10000));
  expect(values[0]).toContain('__Host-ma_refresh=');
  expect(values[0]).toContain('HttpOnly');
  expect(values[0]).toContain('Secure');
  expect(values[0]).toContain('SameSite=Strict');
  expect(values[0]).not.toContain('Domain=');
  const token = security.csrf({ headers: {} }, res);
  const req = {
    headers: {
      origin: 'https://arena.test',
      cookie: `__Host-ma_csrf=${token}`,
      'x-csrf-token': 'é'.repeat(token.length),
    },
  };
  security.requireCsrf(req, res, (error) => expect(error.status).toBe(403));
  req.headers['x-csrf-token'] = token;
  security.requireCsrf(req, res, (error) => expect(error).toBeUndefined());
});
it('requires a real secret and HTTPS frontend origins in production', () => {
  const env = {
    REDIS_URL: 'redis://127.0.0.1',
    MONGODB_URI: 'mongodb://127.0.0.1',
    MONGODB_DB: 'test',
    FRONTEND_ORIGINS: 'http://localhost:5173',
    NODE_ENV: 'production',
    AUTH_SECRET: config.AUTH_SECRET,
  };
  expect(() => parseApiConfig(env)).toThrow('FRONTEND_ORIGINS');
  expect(() =>
    parseApiConfig({
      ...env,
      NODE_ENV: 'test',
      AUTH_SECRET: 'replace-with-a-generated-secret',
    }),
  ).toThrow('AUTH_SECRET');
});
