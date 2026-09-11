import { z } from 'zod';
import { parseConfig } from '@mythic/shared/server';

export function parseApiConfig(env) {
  const base = parseConfig(env);
  const result = z.object({
    AUTH_SECRET: z.string().min(32).max(256).refine((v) => !/replace|example|placeholder/i.test(v)),
    ACCESS_TOKEN_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
    REFRESH_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    RATE_LIMIT_PREFIX: z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/).default('mythic:auth:'),
  }).safeParse(env);
  if (!result.success) throw new Error(`Invalid environment fields: ${[...new Set(result.error.issues.map((issue) => issue.path[0]))].join(', ')}`);
  if (base.NODE_ENV === 'production' && base.FRONTEND_ORIGINS.some((origin) => !origin.startsWith('https://'))) throw new Error('Invalid environment fields: FRONTEND_ORIGINS');
  return { ...base, ...result.data };
}
