import { createHash } from 'node:crypto';
import { commandSchema, LIMITS, RULES_VERSION } from '@mythic/shared';
import {
  applyAction,
  createMatch,
  projectForPlayer,
} from '@mythic/game-engine';
import { HttpError } from '../../utils/errors.js';
import { createRedisGameStore } from './redisStore.js';
import { deadlineOf, endMatch, settleDeadlines } from './lifecycle.js';

const forbidden = () =>
  new HttpError(403, 'FORBIDDEN', 'This match does not belong to you.');
const fingerprint = (actor, command) =>
  createHash('sha256')
    .update(JSON.stringify([actor, command]))
    .digest('hex');

export function createGameService({
  dependencies,
  config,
  deckService,
  now = Date.now,
  afterPersist = async () => {},
}) {
  const store = createRedisGameStore(dependencies.redis, config.GAME_PREFIX);
  const db = dependencies.mongo.db(config.MONGODB_DB);

  async function materialize(reservation) {
    const state = createMatch({
      gameId: reservation.gameId,
      seed: reservation.seed,
      now: reservation.createdAt,
      players: reservation.entrants.map((entry) => ({
        id: entry.id,
        displayName: entry.displayName,
        cards: JSON.parse(entry.cardsJson),
      })),
    });
    const firstPlayerId = state.turn.playerId;
    state.turn = null;
    state.status = 'INITIALIZING';
    state.readyEndsAt = reservation.readyEndsAt;
    for (const player of state.players) player.energy = player.maxEnergy = 0;
    const record = {
      kind: 'GAME',
      state,
      firstPlayerId,
      createdAt: reservation.createdAt,
      ready: {},
      actions: {},
      events: [],
      turns: 0,
      presence: Object.fromEntries(
        reservation.entrants.map((entry) => [
          entry.id,
          {
            token: entry.token,
            connected: true,
            leaseEndsAt: entry.expiresAt,
            disconnectEndsAt: null,
          },
        ]),
      ),
    };
    if (now() >= reservation.readyEndsAt)
      endMatch(
        record,
        { kind: 'ABORT', reason: 'NOT_READY' },
        reservation.readyEndsAt,
      );
    else {
      // A durable membership receipt exists before either client can start play.
      await db.collection('active_matches').updateOne(
        { _id: state.gameId },
        {
          $setOnInsert: {
            players: state.players.map((p) => ({
              id: p.id,
              displayName: p.displayName,
            })),
            createdAt: reservation.createdAt,
          },
        },
        { upsert: true },
      );
    }
    return record;
  }

  async function restoreLost(gameId) {
    const active = await db
      .collection('active_matches')
      .findOne({ _id: gameId });
    if (!active) return null;
    const state = {
      gameId,
      rulesVersion: RULES_VERSION,
      version: 0,
      status: 'INITIALIZING',
      readyEndsAt: now(),
      turn: null,
      resultStatus: 'NONE',
      outcome: null,
      updatedAt: now(),
      players: active.players.map((p) => ({
        ...p,
        health: 20,
        maxHealth: 20,
        energy: 0,
        maxEnergy: 0,
        shield: false,
        connected: false,
        hand: [],
        deck: [],
        discard: [],
        board: [],
        fatigue: 0,
      })),
    };
    const record = {
      kind: 'GAME',
      state,
      createdAt: active.createdAt,
      actions: {},
      ready: {},
      presence: {},
      events: [],
      turns: 0,
    };
    endMatch(record, { kind: 'ABORT', reason: 'STATE_LOST' }, now());
    return record;
  }

  async function update(gameId, work = () => {}, actor) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { raw, record: stored } = await store.read(gameId);
      let record = stored;
      if (!record) record = await restoreLost(gameId);
      if (!record) throw new HttpError(404, 'NOT_FOUND', 'Match not found.');
      if (record.kind === 'RESERVED') record = await materialize(record);
      settleDeadlines(record, now());
      let value;
      let rejected;
      try {
        value = await work(record);
      } catch (error) {
        rejected = error;
      }
      if (JSON.stringify(record) !== raw) {
        if (
          !(await store.commit(gameId, raw, record, deadlineOf(record), actor))
        )
          continue;
      } else if (actor && !(await store.owns(actor.userId, actor.token))) {
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'This connection no longer controls the account.',
        );
      }
      if (rejected) throw rejected;
      return { record, value };
    }
    throw new HttpError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'The match is busy. Restore the board and retry.',
    );
  }

  const member = (record, userId) => {
    if (!record.state.players.some((p) => p.id === userId)) throw forbidden();
  };

  return {
    store,
    update,
    async claim(userId, clientId, token, takeover) {
      await store.claim(userId, clientId, token, takeover);
    },
    async join(user, deckId, token) {
      const previous = await db
        .collection('active_matches')
        .findOne({ 'players.id': user.id });
      if (previous) {
        const { record } = await update(previous._id);
        if (record.state.status !== 'TERMINAL') return { gameId: previous._id };
      }
      const frozen = await deckService.snapshotForMatch(user.id, deckId);
      const result = await store.join(user, frozen.cards, token, now());
      if (result.gameId) await update(result.gameId);
      return result;
    },
    async leave(userId, token) {
      await store.leave(userId, token);
      return store.userStatus(userId);
    },
    async status(userId) {
      const status = await store.userStatus(userId);
      if (!status.gameId) {
        const previous = await db
          .collection('active_matches')
          .findOne({ 'players.id': userId });
        if (previous) return { gameId: previous._id };
      }
      return status;
    },
    async ready(gameId, userId, token) {
      return update(
        gameId,
        (record) => {
          member(record, userId);
          if (record.state.status !== 'INITIALIZING') return;
          const alreadyReady = record.ready[userId];
          record.ready[userId] = true;
          const presence = record.presence[userId];
          presence.connected = true;
          presence.token = token;
          presence.leaseEndsAt = now() + 6000;
          presence.disconnectEndsAt = null;
          record.state.players.find((p) => p.id === userId).connected = true;
          if (!alreadyReady) record.state.version++;
          if (
            record.state.players.every(
              (p) => record.ready[p.id] && record.presence[p.id].connected,
            )
          ) {
            const player = record.state.players.find(
              (p) => p.id === record.firstPlayerId,
            );
            record.state.status = 'ACTIVE';
            record.state.readyEndsAt = null;
            record.startedAt = now();
            record.state.updatedAt = now();
            record.state.turn = {
              number: 1,
              playerId: player.id,
              endsAt: now() + LIMITS.turnMs,
            };
            player.energy = player.maxEnergy = 1;
            record.events = [
              {
                eventId: `event_${record.state.version}`,
                gameId,
                version: record.state.version,
                actionId: null,
                type: 'TURN_STARTED',
                occurredAt: now(),
              },
            ];
          }
        },
        { userId, token },
      );
    },
    async command(userId, input, token) {
      const parsed = commandSchema.safeParse(input);
      if (!parsed.success)
        throw new HttpError(400, 'INVALID_PAYLOAD', 'Invalid game command.');
      const command = parsed.data;
      const digest = fingerprint(userId, command);
      const result = await update(
        command.gameId,
        (record) => {
          member(record, userId);
          const previous = record.actions[command.actionId];
          if (previous) {
            if (previous.fingerprint !== digest)
              throw new HttpError(
                409,
                'ACTION_ID_REUSED',
                'This action ID already belongs to a different command.',
              );
            return previous.ack;
          }
          const turns = record.state.turn?.number ?? record.turns;
          const move = applyAction(record.state, userId, command, now());
          record.state = move.state;
          if (move.events.length) record.events = move.events;
          if (!move.ok) return { ok: false, error: move.error };
          if (move.state.status === 'TERMINAL') {
            record.turns = turns;
            record.endedAt = now();
          }
          const ack = {
            ok: true,
            actionId: command.actionId,
            version: move.state.version,
            eventId: move.events.at(-1).eventId,
          };
          record.actions[command.actionId] = { fingerprint: digest, ack };
          return ack;
        },
        { userId, token },
      );
      return result.value;
    },
    async view(gameId, userId) {
      const { record } = await update(gameId, (r) => member(r, userId));
      return {
        snapshot: projectForPlayer(record.state, userId, now()),
        events: record.events,
      };
    },
    async touch(userId, token) {
      if (!(await store.renew(userId, token)))
        throw new HttpError(
          409,
          'CONTROL_CONFLICT',
          'Another tab has taken control.',
        );
      await store.touchQueue(userId, token, now());
      const { gameId } = await store.userStatus(userId);
      if (!gameId) return;
      await update(
        gameId,
        (record) => {
          if (record.state.status === 'TERMINAL') return;
          const presence = record.presence[userId];
          if (!presence.connected || presence.token !== token) {
            record.state.players.find((p) => p.id === userId).connected = true;
            record.state.version++;
          }
          presence.connected = true;
          presence.token = token;
          presence.leaseEndsAt = now() + 6000;
          presence.disconnectEndsAt = null;
        },
        { userId, token },
      );
    },
    async disconnect(userId, token) {
      try {
        if (!(await store.owns(userId, token))) return;
        await store.leave(userId, token);
        const { gameId } = await store.userStatus(userId);
        if (gameId)
          await update(
            gameId,
            (record) => {
              if (record.state.status === 'TERMINAL') return;
              const presence = record.presence[userId];
              if (presence.token !== token || !presence.connected) return;
              presence.connected = false;
              presence.disconnectEndsAt = now() + LIMITS.reconnectMs;
              record.state.players.find((p) => p.id === userId).connected =
                false;
              record.state.version++;
            },
            { userId, token },
          );
      } finally {
        await store.release(userId, token);
      }
    },
    async persist(gameId) {
      const { record } = await update(gameId);
      if (
        record.state.status !== 'TERMINAL' ||
        record.state.resultStatus === 'PERSISTED'
      )
        return;
      const receipt = {
        _id: gameId,
        mode: 'CASUAL',
        rulesVersion: RULES_VERSION,
        players: record.state.players.map((p) => ({
          id: p.id,
          displayName: p.displayName,
        })),
        outcome: record.state.outcome,
        createdAt: record.createdAt,
        startedAt: record.startedAt ?? null,
        endedAt: record.endedAt,
        turns: record.turns,
      };
      const session = dependencies.mongo.startSession();
      try {
        await session.withTransaction(async () => {
          if (
            !(await db
              .collection('matches')
              .findOne({ _id: gameId }, { session }))
          ) {
            await db.collection('matches').insertOne(receipt, { session });
            if (receipt.outcome.kind === 'WIN')
              await db
                .collection('users')
                .updateOne(
                  { _id: receipt.outcome.winnerId },
                  { $inc: { wins: 1 } },
                  { session },
                );
          }
          await db
            .collection('active_matches')
            .deleteOne({ _id: gameId }, { session });
        });
      } catch (error) {
        if (
          error.code !== 11000 ||
          !(await db.collection('matches').findOne({ _id: gameId }))
        )
          throw error;
      } finally {
        await session.endSession();
      }
      await afterPersist(gameId);
      await update(gameId, (next) => {
        if (next.state.resultStatus !== 'PERSISTED') {
          next.state.resultStatus = 'PERSISTED';
          next.state.version++;
        }
      });
    },
    async work() {
      await store.pruneQueue(now());
      const errors = [];
      const attempt = async (operation) => {
        try {
          await operation();
        } catch (error) {
          errors.push(error);
        }
      };
      // Rebuild schedule scores from state. Stale/missing scheduler entries never
      // become an alternate source of truth; CAS rechecks every transition.
      for (const gameId of await store.games()) {
        await attempt(async () => {
          const { record } = await store.read(gameId);
          if (!record) {
            await update(gameId);
            return;
          }
          const deadline = deadlineOf(record);
          if (deadline !== null)
            await store.redis.zAdd(store.key('due'), {
              score: deadline,
              value: gameId,
            });
        });
      }
      for (const gameId of await store.due(now()))
        await attempt(() => update(gameId));
      // Recover known active matches after Redis state loss; abort without wins.
      await attempt(async () => {
        for (const active of await db
          .collection('active_matches')
          .find({})
          .limit(100)
          .toArray()) {
          await attempt(async () => {
            if (!(await store.read(active._id)).record)
              await update(active._id);
          });
        }
      });
      for (const gameId of (await store.outbox()).slice(0, 20))
        await attempt(() => this.persist(gameId));
      if (errors.length)
        throw new AggregateError(errors, 'Game jobs require retry.');
    },
    async history(userId) {
      const matches = await db
        .collection('matches')
        .find({ 'players.id': userId })
        .sort({ endedAt: -1 })
        .limit(50)
        .toArray();
      return matches.map(({ _id, ...match }) => ({ id: _id, ...match }));
    },
  };
}
