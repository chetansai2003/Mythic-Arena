import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { parseCookie as parse, stringifySetCookie } from 'cookie';
import { HttpError } from '../utils/errors.js';

const serialize = (name, value, options) =>
  stringifySetCookie({ name, value, ...options });

function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export function createCookieSecurity(config, now = Date.now) {
  const secure = config.NODE_ENV === 'production';
  const names = {
    refresh: secure ? '__Host-ma_refresh' : 'ma_refresh',
    csrf: secure ? '__Host-ma_csrf' : 'ma_csrf',
  };
  const options = { httpOnly: true, secure, sameSite: 'strict', path: '/' };
  const cookies = (req) => parse(req.headers.cookie || '');
  const signature = (value) =>
    createHmac('sha256', config.AUTH_SECRET)
      .update(`csrf:${value}`)
      .digest('base64url');
  function validToken(token) {
    if (typeof token !== 'string' || token.length > 180) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [nonce, expiry, mac] = parts;
    return (
      /^[a-zA-Z0-9_-]{43}$/.test(nonce ?? '') &&
      /^\d{13}$/.test(expiry ?? '') &&
      Number(expiry) > now() &&
      equal(mac, signature(`${nonce}.${expiry}`))
    );
  }
  function origin(req) {
    if (!config.FRONTEND_ORIGINS.includes(req.headers.origin))
      throw new HttpError(
        403,
        'CSRF_INVALID',
        'This request could not be verified. Please try again.',
      );
  }
  return {
    names,
    getRefresh: (req) => cookies(req)[names.refresh],
    csrf(req, res) {
      let token = cookies(req)[names.csrf];
      if (!validToken(token)) {
        const value = `${randomBytes(32).toString('base64url')}.${now() + 86400000}`;
        token = `${value}.${signature(value)}`;
      }
      res.append(
        'Set-Cookie',
        serialize(names.csrf, token, { ...options, maxAge: 86400 }),
      );
      return token;
    },
    requireCsrf(req, _res, next) {
      try {
        origin(req);
        const cookie = cookies(req)[names.csrf];
        if (!validToken(cookie) || !equal(cookie, req.headers['x-csrf-token']))
          throw new HttpError(
            403,
            'CSRF_INVALID',
            'This request could not be verified. Please try again.',
          );
        next();
      } catch (error) {
        next(error);
      }
    },
    setRefresh(res, token, expiresAt) {
      res.append(
        'Set-Cookie',
        serialize(names.refresh, token, {
          ...options,
          expires: expiresAt,
          maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now()) / 1000)),
        }),
      );
    },
    clear(res) {
      for (const name of Object.values(names))
        res.append(
          'Set-Cookie',
          serialize(name, '', { ...options, maxAge: 0, expires: new Date(0) }),
        );
    },
  };
}
export function createRateLimit(redis, prefix) {
  const script =
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n";
  return (scope, maximum, keyFor = (req) => req.ip) =>
    async (req, res, next) => {
      try {
        const identity = createHash('sha256')
          .update(String(keyFor(req) ?? 'unknown'))
          .digest('hex');
        const count = await redis.eval(script, {
          keys: [`${prefix}${scope}:${identity}`],
          arguments: ['60000'],
        });
        if (count > maximum) {
          res.set('Retry-After', '60');
          throw new HttpError(
            429,
            'RATE_LIMITED',
            'Too many attempts. Please wait a minute and try again.',
          );
        }
        next();
      } catch (error) {
        next(
          error instanceof HttpError
            ? error
            : new HttpError(
                503,
                'DEPENDENCY_UNAVAILABLE',
                'Account access is temporarily unavailable. Please try again.',
              ),
        );
      }
    };
}
