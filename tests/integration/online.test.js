import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { fork } from 'node:child_process';
import { io } from 'socket.io-client';
import { attachSocketServer } from '../../backend/src/sockets/socketServer.js';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseApiConfig } from '../../backend/src/config/env.js';
import { setupDatabase } from '../../backend/src/models/database.js';
import { createGameService } from '../../backend/src/services/realtime/gameService.js';
import { fixture, command } from '../../backend/tests/engine-fixtures.js';

const namespace = `mythic_online_test_${randomUUID().replaceAll('-', '')}`;
const config = parseApiConfig({
  NODE_ENV: 'test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI ||
    'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
  MONGODB_DB: namespace,
  FRONTEND_ORIGINS: 'http://127.0.0.1:5173',
  AUTH_SECRET: 'local-online-test-secret-'.repeat(4),
});
const dependencies = createDependencies(
  config,
  createLogger('online-test', 'silent'),
);
const db = dependencies.mongo.db(namespace);
let time;
let games;
let actors;
async function clearRedis() {
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
beforeAll(async () => {
  dependencies.start();
  await vi.waitFor(
    async () =>
      expect(await dependencies.check()).toEqual({ redis: true, mongo: true }),
    { timeout: 20000 },
  );
  await setupDatabase(db);
});
beforeEach(async () => {
  await clearRedis();
  await db.collection('active_matches').deleteMany({});
  await db.collection('matches').deleteMany({});
  await db.collection('users').deleteMany({});
  time = 1000000;
  actors = ['alpha', 'beta', 'gamma', 'delta'].map((id) => {
    const clientId = randomUUID();
    return {
      id,
      displayName: id,
      clientId,
      token: `${clientId}:${randomUUID()}`,
    };
  });
  const deckService = {
    snapshotForMatch: async (id) => {
      const player = fixture().players[0];
      return {
        cards: [...player.hand, ...player.deck].map((card, n) => ({
          ...card,
          instanceId: `${id}_${n}`,
        })),
      };
    },
  };
  games = createGameService({
    dependencies,
    config,
    deckService,
    now: () => time,
  });
  await db.collection('users').insertMany(
    actors.map((a) => ({
      _id: a.id,
      email: `${a.id}@test.local`,
      displayName: a.id,
      wins: 0,
    })),
  );
  for (const actor of actors)
    await games.claim(actor.id, actor.clientId, actor.token, false);
});
afterAll(async () => {
  try {
    await clearRedis();
    await db.dropDatabase();
  } finally {
    await dependencies.close();
  }
});
async function pair(start = true) {
  await games.join(actors[0], 'owned', actors[0].token);
  const { gameId } = await games.join(actors[1], 'owned', actors[1].token);
  if (start)
    for (const actor of actors.slice(0, 2))
      await games.ready(gameId, actor.id, actor.token);
  return gameId;
}
const state = async (id) => (await games.store.read(id)).record.state;

async function socketHarness(run, beforeBroadcast) {
  const server = createServer();
  const clients = [];
  const revoked = new Set();
  const sockets = attachSocketServer({
    server,
    config,
    beforeBroadcast,
    services: {
      games,
      auth: {
        authenticate: async (authorization) => {
          const id = authorization.replace('Bearer ', '');
          const actor = actors.find((a) => a.id === id);
          if (!actor || revoked.has(id))
            throw Object.assign(new Error('Session ended.'), {
              code: 'UNAUTHENTICATED',
            });
          return { user: actor, familyId: id, expiresAt: Date.now() + 60000 };
        },
      },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const connect = async (actor, extra = {}) => {
    const client = io(`http://127.0.0.1:${server.address().port}`, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Origin: config.FRONTEND_ORIGINS[0] },
      auth: { accessToken: actor.id, clientId: actor.clientId },
      ...extra,
    });
    clients.push(client);
    await new Promise((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    return client;
  };
  try {
    await run({ connect, sockets, revoked });
  } finally {
    for (const client of clients) client.disconnect();
    await sockets.close();
  }
}
const emit = (client, event, payload) =>
  client.timeout(1500).emitWithAck(event, payload);
async function keepAlive(id, userId) {
  await games.update(id, (record) => {
    for (const [key, presence] of Object.entries(record.presence))
      if (!userId || key === userId) presence.leaseEndsAt = time + 120000;
  });
}

it('reserves each concurrently joining player exactly once', async () => {
  await Promise.all(
    actors.flatMap((a) => [
      games.join(a, 'owned', a.token),
      games.join(a, 'owned', a.token),
    ]),
  );
  const ids = await Promise.all(
    actors.map(async (a) => (await games.status(a.id)).gameId),
  );
  expect(new Set(ids).size).toBe(2);
  for (const id of new Set(ids))
    expect(ids.filter((value) => value === id)).toHaveLength(2);
  expect(await dependencies.redis.zCard(games.store.key('queue'))).toBe(0);
});
it('cancel racing a reservation leaves either one queued opponent or one valid pair', async () => {
  await games.join(actors[0], 'owned', actors[0].token);
  await Promise.all([
    games.leave('alpha', actors[0].token),
    games.join(actors[1], 'owned', actors[1].token),
  ]);
  const a = await games.status('alpha');
  const b = await games.status('beta');
  if (a.gameId) expect(b.gameId).toBe(a.gameId);
  else {
    expect(a.queued).toBe(false);
    expect(b.queued).toBe(true);
  }
});
it('requires both ready, ignores duplicate readiness, and aborts unready reservations', async () => {
  const id = await pair(false);
  await games.ready(id, 'alpha', actors[0].token);
  const first = await state(id);
  await games.ready(id, 'alpha', actors[0].token);
  expect((await state(id)).version).toBe(first.version);
  expect(first.status).toBe('INITIALIZING');
  time += 10000;
  await games.work();
  expect((await state(id)).outcome).toEqual({
    kind: 'ABORT',
    reason: 'NOT_READY',
  });
  expect(
    await db.collection('users').countDocuments({ wins: { $gt: 0 } }),
  ).toBe(0);
});
it('deduplicates simultaneous retries and rejects different commands sharing an action ID', async () => {
  const id = await pair();
  const initial = await state(id);
  const actor = actors.find((a) => a.id === initial.turn.playerId);
  const input = command(initial, 'END_TURN');
  const replies = await Promise.all(
    Array.from({ length: 8 }, () =>
      games.command(actor.id, input, actor.token),
    ),
  );
  expect(replies.every((ack) => ack.ok)).toBe(true);
  expect(
    replies.every((ack) => JSON.stringify(ack) === JSON.stringify(replies[0])),
  ).toBe(true);
  expect((await state(id)).turn.number).toBe(2);
  await expect(
    games.command(actor.id, { ...input, type: 'SURRENDER' }, actor.token),
  ).rejects.toMatchObject({ code: 'ACTION_ID_REUSED' });
});
it('commits only one of two distinct actions against the same version', async () => {
  const id = await pair();
  const initial = await state(id);
  const actor = actors.find((a) => a.id === initial.turn.playerId);
  const input = command(initial, 'END_TURN');
  const replies = await Promise.all(
    [input, { ...input, actionId: randomUUID() }].map((c) =>
      games.command(actor.id, c, actor.token),
    ),
  );
  expect(replies.filter((r) => r.ok)).toHaveLength(1);
  expect((await state(id)).turn.number).toBe(2);
});

it('cannot double-spend energy through concurrent card commands', async () => {
  const id = await pair();
  await games.update(id, (record) => {
    const player = record.state.players.find(
      (p) => p.id === record.state.turn.playerId,
    );
    const all = [...player.hand, ...player.deck];
    const card = all.find((c) => c.definition.kind === 'UNIT');
    player.hand = [card];
    player.deck = all.filter((c) => c.instanceId !== card.instanceId);
    player.energy = player.maxEnergy = card.definition.cost;
  });
  const initial = await state(id);
  const player = initial.players.find((p) => p.id === initial.turn.playerId);
  const actor = actors.find((a) => a.id === player.id);
  const input = command(initial, 'PLAY_CARD', {
    cardInstanceId: player.hand[0].instanceId,
  });
  const replies = await Promise.all(
    [input, { ...input, actionId: randomUUID() }].map((move) =>
      games.command(actor.id, move, actor.token),
    ),
  );
  expect(replies.filter((reply) => reply.ok)).toHaveLength(1);
  const updated = (await state(id)).players.find((p) => p.id === actor.id);
  expect(updated.energy).toBe(0);
  expect(updated.board).toHaveLength(1);
});

it('repairs a reservation interrupted before materialization', async () => {
  const cards = fixture().players.map((p) => [...p.hand, ...p.deck]);
  await games.store.join(actors[0], cards[0], actors[0].token, time);
  const { gameId } = await games.store.join(
    actors[1],
    cards[1],
    actors[1].token,
    time,
  );
  expect((await games.store.read(gameId)).record.kind).toBe('RESERVED');
  await games.work();
  expect((await state(gameId)).status).toBe('INITIALIZING');
  expect(
    await db.collection('active_matches').findOne({ _id: gameId }),
  ).not.toBeNull();
});

it('fails closed while Redis cannot read authoritative state', async () => {
  const id = await pair();
  const initial = await state(id);
  const unavailable = vi
    .spyOn(dependencies.redis, 'get')
    .mockRejectedValueOnce(new Error('Injected Redis outage'));
  await expect(
    games.command('alpha', command(initial, 'SURRENDER'), actors[0].token),
  ).rejects.toThrow('Injected Redis outage');
  unavailable.mockRestore();
  expect(await state(id)).toEqual(initial);
});
it('projects only the viewer hand and refuses outsiders and fenced controllers', async () => {
  const id = await pair();
  const view = await games.view(id, 'alpha');
  expect(view.snapshot.self.hand).toHaveLength(5);
  expect(view.snapshot.opponent.hand).toBeUndefined();
  expect(JSON.stringify(view)).not.toMatch(/"seed"|"deck":|"discard":/);
  await expect(games.view(id, 'gamma')).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
  const replacement = randomUUID();
  await expect(
    games.claim('alpha', replacement, `${replacement}:new`, false),
  ).rejects.toMatchObject({ code: 'CONTROL_CONFLICT' });
  await games.claim('alpha', replacement, `${replacement}:new`, true);
  await expect(
    games.command(
      'alpha',
      command(await state(id), 'SURRENDER'),
      actors[0].token,
    ),
  ).rejects.toMatchObject({ code: 'CONTROL_CONFLICT' });
  expect((await state(id)).status).toBe('ACTIVE');
});
it('rebuilds lost deadlines and ignores stale timer entries', async () => {
  const id = await pair();
  await keepAlive(id);
  const initial = await state(id);
  await dependencies.redis.zAdd(games.store.key('due'), {
    score: time,
    value: id,
  });
  await games.work();
  expect((await state(id)).version).toBe(initial.version);
  await dependencies.redis.del(games.store.key('due'));
  time += 30000;
  await games.work();
  expect((await state(id)).turn.number).toBe(2);
});
it('allows reconnect at 29 seconds without forfeiting', async () => {
  const id = await pair();
  await keepAlive(id, 'beta');
  await games.disconnect('alpha', actors[0].token);
  time += 29000;
  await games.claim('alpha', actors[0].clientId, actors[0].token, false);
  await games.touch('alpha', actors[0].token);
  time += 1000;
  await games.work();
  expect((await state(id)).status).toBe('ACTIVE');
  expect(
    (await state(id)).players.find((p) => p.id === 'alpha').connected,
  ).toBe(true);
});
it('resolves a 30-second disconnect before an equal turn deadline and credits once', async () => {
  const id = await pair();
  await keepAlive(id, 'beta');
  await games.disconnect('alpha', actors[0].token);
  time += 30000;
  await games.update(id);
  expect((await state(id)).outcome).toEqual({
    kind: 'WIN',
    winnerId: 'beta',
    reason: 'DISCONNECT',
  });
  await Promise.all([games.persist(id), games.persist(id), games.persist(id)]);
  expect((await db.collection('users').findOne({ _id: 'beta' })).wins).toBe(1);
  expect(await db.collection('matches').countDocuments({ _id: id })).toBe(1);
  expect((await state(id)).resultStatus).toBe('PERSISTED');
});
it('aborts both-offline matches without awarding a win', async () => {
  const id = await pair();
  await Promise.all(
    actors.slice(0, 2).map((a) => games.disconnect(a.id, a.token)),
  );
  time += 30000;
  await games.work();
  expect((await state(id)).outcome).toEqual({
    kind: 'ABORT',
    reason: 'BOTH_OFFLINE',
  });
  expect(await db.collection('users').countDocuments({ wins: 1 })).toBe(0);
});
it('recovers lost Redis match state as a durable abort without credit', async () => {
  const id = await pair();
  await clearRedis();
  await games.work();
  expect((await state(id)).outcome).toEqual({
    kind: 'ABORT',
    reason: 'STATE_LOST',
  });
  expect((await games.history('alpha'))[0].id).toBe(id);
  expect(await db.collection('users').countDocuments({ wins: 1 })).toBe(0);
});

it('socket boundary rejects invalid origins, credentials, payloads, and unauthorized rooms', async () => {
  const id = await pair();
  await socketHarness(async ({ connect, sockets }) => {
    await expect(
      connect(actors[2], {
        extraHeaders: { Origin: 'https://untrusted.example' },
      }),
    ).rejects.toThrow();
    await expect(
      connect(actors[2], {
        auth: { accessToken: 'invalid', clientId: randomUUID() },
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } });
    const outsider = await connect(actors[2]);
    expect(await emit(outsider, 'state:request', { gameId: id })).toMatchObject(
      { ok: false, error: { code: 'FORBIDDEN' } },
    );
    expect(
      await emit(outsider, 'queue:leave', { unexpected: true }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } });
    expect(await emit(outsider, '__proto__', {})).toMatchObject({
      ok: false,
      error: { code: 'INVALID_PAYLOAD' },
    });
    const ended = new Promise((resolve) =>
      outsider.once('disconnect', resolve),
    );
    sockets.revoke('gamma');
    await ended;
    expect(outsider.connected).toBe(false);
  });
});

it('retries the original action after losing the post-commit socket acknowledgement', async () => {
  const id = await pair();
  let client;
  let drop = true;
  await socketHarness(
    async ({ connect }) => {
      const initial = await state(id);
      const actor = actors.find((a) => a.id === initial.turn.playerId);
      client = await connect(actor);
      await emit(client, 'state:request', { gameId: id });
      const input = command(await state(id), 'END_TURN');
      await expect(emit(client, 'game:command', input)).rejects.toThrow();
      expect((await state(id)).turn.number).toBe(2);
      client = await connect(actor);
      const ack = await emit(client, 'game:command', input);
      expect(ack.ok).toBe(true);
      expect((await state(id)).turn.number).toBe(2);
    },
    async () => {
      if (drop) {
        drop = false;
        client.disconnect();
      }
    },
  );
});

it('keeps results pending after a storage failure and retries without duplicate wins', async () => {
  const id = await pair();
  await games.command(
    'alpha',
    command(await state(id), 'SURRENDER'),
    actors[0].token,
  );
  const pending = await games.store.read(id);
  const failure = vi
    .spyOn(dependencies.mongo, 'startSession')
    .mockImplementationOnce(() => {
      throw new Error('Injected storage outage');
    });
  await expect(games.persist(id)).rejects.toThrow('Injected storage outage');
  failure.mockRestore();
  expect((await state(id)).resultStatus).toBe('PENDING');
  expect(await games.store.outbox()).toContain(id);
  await games.persist(id);
  // Simulate death after Mongo commit but before the Redis completion receipt.
  await dependencies.redis.set(games.store.key(`game:${id}`), pending.raw);
  await dependencies.redis.sAdd(games.store.key('outbox'), id);
  await games.persist(id);
  expect((await db.collection('users').findOne({ _id: 'beta' })).wins).toBe(1);
  expect((await state(id)).resultStatus).toBe('PERSISTED');
});

function launch(role, gameId) {
  const child = fork(
    new URL('../fixtures/online-process.js', import.meta.url),
    [],
    {
      env: {
        ...process.env,
        MYTHIC_FAULT_CONFIG: JSON.stringify(config),
        MYTHIC_FAULT_ROLE: role,
        MYTHIC_FAULT_TIME: String(time),
        MYTHIC_FAULT_GAME: gameId ?? '',
      },
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    },
  );
  const messages = [];
  let errors = '';
  child.stderr.on('data', (data) => {
    errors += String(data);
  });
  child.on('message', (message) => messages.push(message));
  return {
    async wait(event) {
      await vi.waitFor(
        () => {
          if (child.exitCode !== null)
            throw new Error(`Child exited: ${errors}`);
          expect(messages.some((message) => message.event === event)).toBe(
            true,
          );
        },
        { timeout: 10000 },
      );
      return messages.find((message) => message.event === event);
    },
    async kill() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGKILL');
      await exited;
    },
  };
}

it('survives killing the API after commit while a separate worker advances the match', async () => {
  const id = await pair();
  await keepAlive(id);
  const apiProcess = launch('api');
  let worker;
  let client;
  try {
    const { port } = await apiProcess.wait('ready');
    const initial = await state(id);
    const controller = actors.find((a) => a.id === initial.turn.playerId);
    client = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Origin: config.FRONTEND_ORIGINS[0] },
      auth: { accessToken: controller.id, clientId: controller.clientId },
    });
    await new Promise((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    await emit(client, 'state:request', { gameId: id });
    const input = command(await state(id), 'END_TURN');
    const lost = emit(client, 'game:command', input).catch(() => null);
    await apiProcess.wait('committed');
    await apiProcess.kill();
    await lost;
    expect((await state(id)).turn.number).toBe(2);
    // An independently started worker does not require the API process.
    time += 30000;
    worker = launch('worker');
    await worker.wait('ready');
    await vi.waitFor(
      async () => expect((await state(id)).turn.number).toBe(3),
      { timeout: 5000 },
    );
    await games.claim(
      controller.id,
      controller.clientId,
      controller.token,
      false,
    );
    const acknowledgement = await games.command(
      controller.id,
      input,
      controller.token,
    );
    expect(acknowledgement.ok).toBe(true);
    expect((await state(id)).turn.number).toBe(3);
  } finally {
    client?.disconnect();
    await apiProcess.kill();
    await worker?.kill();
  }
});

it('survives killing the result worker after Mongo commit without awarding twice', async () => {
  const id = await pair();
  await games.command(
    'alpha',
    command(await state(id), 'SURRENDER'),
    actors[0].token,
  );
  const first = launch('persist', id);
  let restarted;
  try {
    await first.wait('committed');
    await first.kill();
    expect((await state(id)).resultStatus).toBe('PENDING');
    expect((await db.collection('users').findOne({ _id: 'beta' })).wins).toBe(
      1,
    );
    restarted = launch('worker');
    await restarted.wait('ready');
    await vi.waitFor(
      async () => expect((await state(id)).resultStatus).toBe('PERSISTED'),
      { timeout: 5000 },
    );
    expect((await db.collection('users').findOne({ _id: 'beta' })).wins).toBe(
      1,
    );
  } finally {
    await first.kill();
    await restarted?.kill();
  }
});
