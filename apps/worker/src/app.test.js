import { expect, it } from 'vitest';
import request from 'supertest';
import { createWorkerHandler } from './app.js';

it('reports worker readiness and explicitly has no gameplay jobs', async () => {
  const lifecycle = { shuttingDown: false };
  const app = createWorkerHandler({
    lifecycle,
    dependencies: { check: async () => ({ redis: true, mongo: true }) },
  });
  expect((await request(app).get('/health/live')).body.jobs).toBe(
    'not_implemented',
  );
  expect((await request(app).get('/health/ready')).status).toBe(200);
  lifecycle.shuttingDown = true;
  expect((await request(app).get('/health/ready')).status).toBe(503);
});
