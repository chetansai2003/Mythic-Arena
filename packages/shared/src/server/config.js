import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65535);
function validUrl(value, protocols, originOnly = false) {
  try {
    const url = new URL(value);
    return (
      protocols.includes(url.protocol) && (!originOnly || url.origin === value)
    );
  } catch {
    return false;
  }
}
const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: port.default(3001),
  WORKER_PORT: port.default(3002),
  REDIS_URL: z.url().refine((v) => validUrl(v, ['redis:', 'rediss:'])),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\/\S+$/),
  MONGODB_DB: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
  GAME_PREFIX: z
    .string()
    .regex(/^[a-zA-Z0-9:_-]{1,100}$/)
    .optional(),
  FRONTEND_ORIGINS: z
    .string()
    .min(1)
    .transform((v) => v.split(',').map((o) => o.trim()))
    .pipe(
      z
        .array(z.url().refine((v) => validUrl(v, ['http:', 'https:'], true)))
        .min(1),
    ),
  LOG_LEVEL: z
    .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug'])
    .default('info'),
});
export function parseConfig(env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
    ].join(', ');
    throw new Error(`Invalid environment fields: ${fields}`);
  }
  return {
    ...parsed.data,
    GAME_PREFIX: parsed.data.GAME_PREFIX ?? `${parsed.data.MONGODB_DB}:game:`,
  };
}
