import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import {
  createDependencies,
  createLogger,
  parseConfig,
} from '@mythic/shared/server';

const namespace = `mythic_test_${randomUUID().replaceAll('-', '')}`;
const config = parseConfig({
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI ||
    'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
  MONGODB_DB: namespace,
  FRONTEND_ORIGINS: 'http://127.0.0.1:5173',
  LOG_LEVEL: 'silent',
});
const dependencies = createDependencies(
  config,
  createLogger('integration', 'silent'),
);
beforeAll(async () => {
  dependencies.start();
  await vi.waitFor(
    async () =>
      expect(await dependencies.check()).toEqual({ redis: true, mongo: true }),
    { timeout: 20000, interval: 250 },
  );
});
afterAll(async () => {
  try {
    if (dependencies.redis.isReady)
      await dependencies.redis.del(`${namespace}:roundtrip`);
    await dependencies.mongo.db(namespace).dropDatabase();
  } finally {
    await dependencies.close();
  }
});
it('round-trips Redis values in an isolated namespace', async () => {
  await dependencies.redis.set(`${namespace}:roundtrip`, 'ready', { EX: 60 });
  expect(await dependencies.redis.get(`${namespace}:roundtrip`)).toBe('ready');
});
it('commits and rolls back actual MongoDB replica-set transactions', async () => {
  const collection = dependencies.mongo.db(namespace).collection('receipts');
  await collection.createIndex({ matchId: 1 }, { unique: true });
  const session = dependencies.mongo.startSession();
  try {
    await session.withTransaction(async () => {
      await collection.insertOne({ matchId: 'committed' }, { session });
    });
    expect(await collection.countDocuments({ matchId: 'committed' })).toBe(1);
    await expect(
      session.withTransaction(async () => {
        await collection.insertOne({ matchId: 'rolled_back' }, { session });
        throw new Error('Intentional rollback');
      }),
    ).rejects.toThrow('Intentional rollback');
    expect(await collection.countDocuments({ matchId: 'rolled_back' })).toBe(0);
  } finally {
    await session.endSession();
  }
});
it('bounds readiness failures and recovers after a Redis connection loss', async () => {
  // Destroy only this test-owned client, not a shared Redis server or data.
  dependencies.redis.destroy();
  const start = Date.now();
  expect((await dependencies.check()).redis).toBe(false);
  expect(Date.now() - start).toBeLessThan(2500);
  await dependencies.redis.connect();
  await expect
    .poll(async () => dependencies.check())
    .toEqual({ redis: true, mongo: true });
});
