import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

function setup() {
  const dependencies = {
    check: vi.fn().mockResolvedValue({ redis: true, mongo: true }),
  };
  const lifecycle = { shuttingDown: false };
  const logger = { info: vi.fn(), warn: vi.fn() };
  return {
    dependencies,
    lifecycle,
    logger,
    app: createApp({
      dependencies,
      lifecycle,
      logger,
      config: { FRONTEND_ORIGINS: ['http://localhost:5173'] },
    }),
  };
}
describe('API foundation', () => {
  it('keeps liveness independent and readiness reflects dependency recovery', async () => {
    const { app, dependencies } = setup();
    expect((await request(app).get('/health/live')).status).toBe(200);
    expect(dependencies.check).not.toHaveBeenCalled();
    expect((await request(app).get('/health/ready')).status).toBe(200);
    dependencies.check.mockResolvedValue({ redis: false, mongo: true });
    expect((await request(app).get('/health/ready')).status).toBe(503);
    dependencies.check.mockResolvedValue({ redis: true, mongo: true });
    expect((await request(app).get('/health/ready')).status).toBe(200);
  });
  it('fails readiness during shutdown', async () => {
    const { app, lifecycle } = setup();
    lifecycle.shuttingDown = true;
    expect((await request(app).get('/health/ready')).status).toBe(503);
  });
  it('validates request IDs and does not log arbitrary bodies', async () => {
    const { app, logger } = setup();
    const response = await request(app)
      .get('/missing')
      .set('x-request-id', 'x'.repeat(100));
    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      (await request(app).get('/health/live').set('x-request-id', 'safe_id'))
        .headers['x-request-id'],
    ).toBe('safe_id');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
      'authorization',
    );
  });
  it('allows explicit origins and rejects others', async () => {
    const { app } = setup();
    const allowed = await request(app)
      .get('/health/live')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(
      (
        await request(app)
          .get('/health/live')
          .set('Origin', 'https://evil.invalid')
      ).status,
    ).toBe(403);
  });
  it('returns safe errors for malformed JSON', async () => {
    const { app } = setup();
    const response = await request(app)
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{"password":"never-expose"');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
    expect(response.text).not.toContain('never-expose');
  });
});
