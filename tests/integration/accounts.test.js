import { randomUUID } from 'node:crypto';
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseApiConfig } from '../../backend/src/config/env.js';
import { setupDatabase } from '../../backend/src/models/database.js';
import { createApiServices } from '../../backend/src/routes/index.js';
import { createApp } from '../../backend/src/app.js';
import { CATALOG } from '../../backend/src/models/cards.js';

const namespace = `mythic_auth_test_${randomUUID().replaceAll('-', '')}`;
const origin = 'http://127.0.0.1:5173';
const password = 'a secure test passphrase 123';
const config = parseApiConfig({
  NODE_ENV: 'test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI ||
    'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
  MONGODB_DB: namespace,
  FRONTEND_ORIGINS: origin,
  AUTH_SECRET: 'test-local-secret-'.repeat(4),
  RATE_LIMIT_PREFIX: `${namespace}:`,
});
const logger = createLogger('auth-integration', 'silent');
const dependencies = createDependencies(config, logger);
const db = dependencies.mongo.db(namespace);
const cardIds = CATALOG.slice(0, 15).flatMap((card) => [card.id, card.id]);
let app;
let services;
let offset = 0;
const revoked = vi.fn();
async function clearRates() {
  if (!dependencies.redis.isReady) return;
  let cursor = '0';
  do {
    const result = await dependencies.redis.scan(cursor, {
      MATCH: `${namespace}:*`,
      COUNT: 100,
    });
    if (result.keys.length) await dependencies.redis.del(result.keys);
    cursor = String(result.cursor);
  } while (cursor !== '0');
}
async function client(email = 'alpha@example.test', register = false) {
  const agent = request.agent(app);
  const csrfResponse = await agent.get('/auth/csrf');
  expect(csrfResponse.status).toBe(200);
  const csrf = csrfResponse.body.csrfToken;
  const csrfCookie = csrfResponse.headers['set-cookie'][0].split(';')[0];
  const response = await agent
    .post(register ? '/auth/register' : '/auth/login')
    .set('Origin', origin)
    .set('x-csrf-token', csrf)
    .send({
      email,
      password,
      ...(register
        ? { displayName: email.startsWith('alpha') ? 'Alpha' : 'Beta' }
        : {}),
    });
  expect(response.status).toBe(register ? 201 : 200);
  return {
    agent,
    csrf,
    csrfCookie,
    response,
    token: response.body.accessToken,
  };
}
const mutate = (actor, method, path, body) =>
  actor.agent[method](path)
    .set('Origin', origin)
    .set('x-csrf-token', actor.csrf)
    .set('Authorization', `Bearer ${actor.token}`)
    .send(body);
beforeAll(async () => {
  dependencies.start();
  await vi.waitFor(
    async () =>
      expect(await dependencies.check()).toEqual({ redis: true, mongo: true }),
    { timeout: 20000 },
  );
  await setupDatabase(db);
  services = await createApiServices({
    config,
    dependencies,
    now: () => Date.now() + offset,
    onSessionRevoked: revoked,
  });
  app = createApp({ config, dependencies, services, logger });
  await client('alpha@example.test', true);
  await client('beta@example.test', true);
});
beforeEach(async () => {
  offset = 0;
  await clearRates();
});
afterAll(async () => {
  try {
    await clearRates();
    await db.dropDatabase();
  } finally {
    await dependencies.close();
  }
});

describe('identity and session security', () => {
  it('stores Argon2id hashes and only hashed refresh tokens', async () => {
    const user = await db
      .collection('users')
      .findOne({ email: 'alpha@example.test' });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(password);
    const actor = await client();
    expect(actor.response.body.user).not.toHaveProperty('passwordHash');
    expect(actor.response.body).not.toHaveProperty('refreshToken');
    const raw = actor.response.headers['set-cookie'][0]
      .split(';')[0]
      .split('=')[1];
    const records = await db.collection('refresh_tokens').find({}).toArray();
    expect(JSON.stringify(records)).not.toContain(raw);
    expect(
      records.every((record) => /^[a-f0-9]{64}$/.test(record.tokenHash)),
    ).toBe(true);
  });
  it('normalizes identity, rejects duplicates, and gives safe credential errors', async () => {
    const actor = await client('  ALPHA@EXAMPLE.TEST  ');
    expect(actor.response.body.user.email).toBe('alpha@example.test');
    const duplicate = await mutate(actor, 'post', '/auth/register', {
      email: 'ALPHA@example.test',
      password,
      displayName: 'Duplicate',
    });
    expect(duplicate.status).toBe(409);
    const wrong = await mutate(actor, 'post', '/auth/login', {
      email: 'alpha@example.test',
      password: 'incorrect password',
    });
    const missing = await mutate(actor, 'post', '/auth/login', {
      email: 'nobody@example.test',
      password: 'incorrect password',
    });
    expect(wrong.status).toBe(401);
    expect(missing.body.error.message).toBe(wrong.body.error.message);
  });
  it('refreshes an expired access token and rejects the expired token', async () => {
    const actor = await client();
    offset = 601000;
    expect(
      (
        await actor.agent
          .get('/auth/me')
          .set('Authorization', `Bearer ${actor.token}`)
      ).status,
    ).toBe(401);
    const refreshed = await mutate(actor, 'post', '/auth/refresh', {});
    expect(refreshed.status).toBe(200);
    expect(
      (
        await actor.agent
          .get('/auth/me')
          .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      ).status,
    ).toBe(200);
  });
  it('rotates once and revokes the whole family after old-token reuse', async () => {
    const actor = await client();
    const oldRefresh = actor.response.headers['set-cookie'][0].split(';')[0];
    const next = await mutate(actor, 'post', '/auth/refresh', {});
    expect(next.status).toBe(200);
    expect(next.headers['set-cookie'][0]).not.toEqual(
      actor.response.headers['set-cookie'][0],
    );
    const replay = await request(app)
      .post('/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [actor.csrfCookie, oldRefresh])
      .set('x-csrf-token', actor.csrf)
      .send({});
    expect(replay.status).toBe(401);
    expect(
      (
        await actor.agent
          .get('/auth/me')
          .set('Authorization', `Bearer ${next.body.accessToken}`)
      ).status,
    ).toBe(401);
    expect(revoked).toHaveBeenCalled();
  });
  it('rejects expired refresh sessions', async () => {
    const actor = await client();
    const oldRefresh = actor.response.headers['set-cookie'][0].split(';')[0];
    offset = 8 * 86400000;
    const csrfResponse = await actor.agent.get('/auth/csrf');
    const expired = await request(app)
      .post('/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [
        csrfResponse.headers['set-cookie'][0].split(';')[0],
        oldRefresh,
      ])
      .set('x-csrf-token', csrfResponse.body.csrfToken)
      .send({});
    expect(expired.status).toBe(401);
  });
  it('logout immediately revokes access and refresh credentials', async () => {
    const actor = await client();
    expect((await mutate(actor, 'post', '/auth/logout', {})).status).toBe(204);
    expect(
      (
        await actor.agent
          .get('/auth/me')
          .set('Authorization', `Bearer ${actor.token}`)
      ).status,
    ).toBe(401);
  });
  it('rejects missing authentication, CSRF and foreign origins', async () => {
    expect((await request(app).get('/decks')).status).toBe(401);
    const actor = await client();
    expect(
      (
        await actor.agent
          .post('/decks')
          .set('Origin', origin)
          .set('Authorization', `Bearer ${actor.token}`)
          .send({ name: 'Bad CSRF', cardIds })
      ).status,
    ).toBe(403);
    expect(
      (
        await actor.agent
          .post('/decks')
          .set('Origin', 'https://evil.test')
          .set('Authorization', `Bearer ${actor.token}`)
          .set('x-csrf-token', actor.csrf)
          .send({ name: 'Bad origin', cardIds })
      ).status,
    ).toBe(403);
  });
  it('enforces the Redis login throttle', async () => {
    const actor = await client();
    let response;
    for (let i = 0; i < 9; i++)
      response = await mutate(actor, 'post', '/auth/login', {
        email: 'rate-test@example.test',
        password: 'wrong password',
      });
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
  });
});
it('revokes both the displayed access session and a newer cookie session on logout', async () => {
  const actor = await client();
  const newer = await mutate(actor, 'post', '/auth/login', {
    email: 'alpha@example.test',
    password,
  });
  expect(newer.status).toBe(200);
  expect((await mutate(actor, 'post', '/auth/logout', {})).status).toBe(204);
  for (const token of [actor.token, newer.body.accessToken])
    expect(
      (
        await actor.agent
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(401);
});

it('serializes concurrent refreshes and rejects reuse without leaving a valid replacement', async () => {
  const actor = await client();
  const oldCookie = actor.response.headers['set-cookie'][0].split(';')[0];
  const retry = () =>
    request(app)
      .post('/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [actor.csrfCookie, oldCookie])
      .set('x-csrf-token', actor.csrf)
      .send({});
  const results = await Promise.all([retry(), retry()]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
  const token = results.find((result) => result.status === 200).body
    .accessToken;
  expect(
    (await actor.agent.get('/auth/me').set('Authorization', `Bearer ${token}`))
      .status,
  ).toBe(401);
});

describe('catalog and deck persistence', () => {
  it('seeds exactly 20 immutable definitions idempotently', async () => {
    await setupDatabase(db);
    const response = await request(app).get('/cards');
    expect(response.status).toBe(200);
    expect(response.body.cards).toHaveLength(20);
    expect(response.body.cards.every((card) => card.playable === true)).toBe(
      true,
    );
  });
  it('saves a complete deck and reloads it from MongoDB', async () => {
    const actor = await client();
    const saved = await mutate(actor, 'post', '/decks', {
      name: 'First Light',
      cardIds,
    });
    expect(saved.status).toBe(201);
    const reload = await actor.agent
      .get('/decks')
      .set('Authorization', `Bearer ${actor.token}`);
    expect(
      reload.body.decks.find((deck) => deck.id === saved.body.deck.id).cardIds,
    ).toEqual(cardIds);
  });
  it('rejects wrong deck sizes, unknown IDs and three copies', async () => {
    const actor = await client();
    for (const invalid of [
      cardIds.slice(1),
      [...cardIds, 'extra'],
      [...cardIds.slice(0, 29), 'unknown_definition'],
      [...cardIds.slice(0, 29), cardIds[0]],
    ])
      expect(
        (
          await mutate(actor, 'post', '/decks', {
            name: 'Invalid deck',
            cardIds: invalid,
          })
        ).status,
      ).toBe(400);
  });
  it('enforces ownership for list, update and deletion', async () => {
    const alpha = await client();
    const beta = await client('beta@example.test');
    const created = await mutate(alpha, 'post', '/decks', {
      name: 'Private strategy',
      cardIds,
    });
    const id = created.body.deck.id;
    const list = await beta.agent
      .get('/decks')
      .set('Authorization', `Bearer ${beta.token}`);
    expect(list.body.decks.some((deck) => deck.id === id)).toBe(false);
    expect(
      (
        await mutate(beta, 'patch', `/decks/${id}`, {
          name: 'Stolen',
          expectedRevision: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (await mutate(beta, 'delete', `/decks/${id}`, { expectedRevision: 1 }))
        .status,
    ).toBe(404);
    expect(await db.collection('decks').countDocuments({ _id: id })).toBe(1);
  });
  it('prevents conflicting updates and requires a current revision to delete', async () => {
    const actor = await client();
    const created = await mutate(actor, 'post', '/decks', {
      name: 'Revision test',
      cardIds,
    });
    const id = created.body.deck.id;
    const results = await Promise.all(
      ['One', 'Two'].map((name) =>
        mutate(actor, 'patch', `/decks/${id}`, { name, expectedRevision: 1 }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (await mutate(actor, 'delete', `/decks/${id}`, { expectedRevision: 1 }))
        .status,
    ).toBe(409);
    expect(
      (await mutate(actor, 'delete', `/decks/${id}`, { expectedRevision: 2 }))
        .status,
    ).toBe(204);
  });
  it('prepares isolated match snapshots with unique stable instance IDs', async () => {
    const actor = await client();
    const created = await mutate(actor, 'post', '/decks', {
      name: 'Frozen cards',
      cardIds,
    });
    const deckId = created.body.deck.id;
    const snapshot = await services.deckService.snapshotForMatch(
      actor.response.body.user.id,
      deckId,
    );
    const previous = JSON.stringify(snapshot);
    await mutate(actor, 'patch', `/decks/${deckId}`, {
      cardIds: [...cardIds].reverse(),
      expectedRevision: 1,
    });
    expect(JSON.stringify(snapshot)).toBe(previous);
    expect(new Set(snapshot.cards.map((card) => card.instanceId)).size).toBe(
      30,
    );
    expect(snapshot.rulesVersion).toBe('1');
  });
});
