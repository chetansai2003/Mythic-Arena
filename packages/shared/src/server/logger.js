import pino from 'pino';

export function createLogger(service, level = 'info') {
  return pino({
    name: service,
    level,
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'config',
        'headers',
        'body',
        'req.headers',
        'req.body',
      ],
      censor: '[REDACTED]',
    },
  });
}
