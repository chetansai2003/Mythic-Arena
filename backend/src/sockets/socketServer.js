import { Server } from 'socket.io';
import { z } from 'zod';
import { clientEventSchemas } from '@mythic/shared';

const handshake = z.strictObject({
  accessToken: z.string().min(1).max(4096),
  clientId: z.uuid(),
  takeover: z.boolean().optional(),
});
const safeError = (error) => ({
  code:
    error.code &&
    [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONTROL_CONFLICT',
      'INVALID_PAYLOAD',
      'RATE_LIMITED',
      'ACTION_ID_REUSED',
    ].includes(error.code)
      ? error.code
      : 'DEPENDENCY_UNAVAILABLE',
  message:
    error.code &&
    [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONTROL_CONFLICT',
      'INVALID_PAYLOAD',
      'RATE_LIMITED',
      'ACTION_ID_REUSED',
    ].includes(error.code)
      ? error.message
      : 'Online services are temporarily unavailable. Your move may need a retry.',
});

export function attachSocketServer({
  server,
  config,
  services,
  beforeBroadcast = async () => {},
}) {
  const { games, auth } = services;
  const io = new Server(server, {
    maxHttpBufferSize: 16384,
    cors: { origin: config.FRONTEND_ORIGINS, credentials: true },
    allowRequest: (req, callback) =>
      callback(null, config.FRONTEND_ORIGINS.includes(req.headers.origin)),
  });
  let stopping = false;
  const disconnects = new Set();
  io.use(async (socket, next) => {
    try {
      const input = handshake.parse(socket.handshake.auth);
      const identity = await auth.authenticate(`Bearer ${input.accessToken}`);
      const token = `${input.clientId}:${socket.id}`;
      await games.claim(
        identity.user.id,
        input.clientId,
        token,
        input.takeover,
      );
      socket.data = {
        identity,
        authorization: `Bearer ${input.accessToken}`,
        token,
        version: -1,
        gameId: null,
        found: null,
        pushing: false,
        lastAuth: Date.now(),
      };
      next();
    } catch (error) {
      const failure =
        error instanceof z.ZodError
          ? {
              code: 'INVALID_PAYLOAD',
              message: 'Invalid connection credentials.',
            }
          : safeError(error);
      next(Object.assign(new Error(failure.message), { data: failure }));
    }
  });

  async function push(socket, force = false) {
    if (socket.data.pushing || !socket.connected) return;
    socket.data.pushing = true;
    try {
      if (
        !(await games.store.owns(
          socket.data.identity.user.id,
          socket.data.token,
        ))
      )
        throw Object.assign(new Error('Another tab has taken control.'), {
          code: 'CONTROL_CONFLICT',
        });
      const status = await games.store.userStatus(socket.data.identity.user.id);
      const gameId = status.gameId ?? socket.data.gameId;
      const queue = {
        status: status.queued ? 'QUEUED' : 'IDLE',
        queuedAt: status.queuedAt ?? null,
      };
      const queueKey = JSON.stringify(queue);
      if (queueKey !== socket.data.queue) {
        socket.emit('queue:state', queue);
        socket.data.queue = queueKey;
      }
      if (!gameId) return;
      const { snapshot, events } = await games.view(
        gameId,
        socket.data.identity.user.id,
      );
      if (socket.data.gameId !== gameId) {
        socket.data.version = -1;
        socket.data.gameId = gameId;
      }
      if (snapshot.status === 'INITIALIZING' && socket.data.found !== gameId) {
        socket.emit('match:found', {
          gameId,
          opponent: {
            id: snapshot.opponent.id,
            displayName: snapshot.opponent.displayName,
          },
          readyEndsAt: snapshot.readyEndsAt,
        });
        socket.data.found = gameId;
      }
      if (
        force ||
        socket.data.unavailable ||
        snapshot.version !== socket.data.version
      ) {
        const oldVersion = socket.data.version;
        socket.emit('game:state', snapshot);
        if (!force && oldVersion >= 0 && snapshot.version === oldVersion + 1)
          for (const event of events)
            if (event.version === snapshot.version)
              socket.emit('game:event', event);
        if (snapshot.status === 'TERMINAL')
          socket.emit('game:ended', {
            gameId,
            outcome: snapshot.outcome,
            resultStatus: snapshot.resultStatus,
          });
        socket.data.version = snapshot.version;
        socket.data.unavailable = false;
      }
    } catch (error) {
      const failure = safeError(error);
      if (!socket.data.unavailable) socket.emit('game:error', failure);
      socket.data.unavailable = true;
      if (failure.code === 'CONTROL_CONFLICT') socket.disconnect(true);
    } finally {
      socket.data.pushing = false;
    }
  }

  async function authorize(socket, event) {
    socket.data.identity = await auth.authenticate(socket.data.authorization);
    await games.touch(socket.data.identity.user.id, socket.data.token);
    const limit = event === 'queue:join' ? 10 : 180;
    const counter = `${config.GAME_PREFIX}rate:${socket.data.identity.user.id}:${event === 'queue:join' ? 'queue' : 'command'}`;
    const count = await games.store.redis.eval(
      `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end return n`,
      { keys: [counter], arguments: [] },
    );
    if (count > limit)
      throw Object.assign(
        new Error('Too many requests. Please wait a moment.'),
        { code: 'RATE_LIMITED' },
      );
  }
  io.on('connection', (socket) => {
    for (const other of io.sockets.sockets.values()) {
      if (
        other !== socket &&
        other.data.identity?.user.id === socket.data.identity.user.id
      ) {
        other.emit('game:error', {
          code: 'CONTROL_CONFLICT',
          message: 'Another tab has taken control.',
        });
        other.disconnect(true);
      }
    }
    const expiry = setTimeout(
      () => {
        socket.emit('game:error', {
          code: 'UNAUTHENTICATED',
          message: 'Refresh your session to reconnect.',
        });
        socket.disconnect(true);
      },
      Math.max(0, socket.data.identity.expiresAt - Date.now()),
    );
    socket.onAny(async (event, input, ack) => {
      if (typeof ack !== 'function')
        return socket.emit('game:error', {
          code: 'INVALID_PAYLOAD',
          message: 'An acknowledgement is required.',
        });
      try {
        const schema = Object.hasOwn(clientEventSchemas, event)
          ? clientEventSchemas[event]
          : null;
        const parsed = schema?.safeParse(input);
        if (!parsed?.success)
          return ack({
            ok: false,
            error: {
              code: 'INVALID_PAYLOAD',
              message: 'Invalid event payload.',
            },
          });
        await authorize(socket, event);
        const userId = socket.data.identity.user.id;
        let result = { ok: true };
        if (event === 'queue:join')
          await games.join(
            socket.data.identity.user,
            parsed.data.deckId,
            socket.data.token,
          );
        if (event === 'queue:leave')
          await games.leave(userId, socket.data.token);
        if (event === 'match:ready')
          await games.ready(parsed.data.gameId, userId, socket.data.token);
        if (event === 'game:command') {
          result = await games.command(userId, parsed.data, socket.data.token);
          await beforeBroadcast({
            command: parsed.data,
            acknowledgement: result,
          });
        }
        if (event === 'state:request') {
          await games.view(parsed.data.gameId, userId); // Membership before remembering requested ID.
          socket.data.gameId = parsed.data.gameId;
          await push(socket, true);
        } else
          await Promise.all(
            [...io.sockets.sockets.values()].map((client) => push(client)),
          );
        ack(result);
      } catch (error) {
        ack({ ok: false, error: safeError(error) });
      }
    });
    socket.on('disconnect', () => {
      clearTimeout(expiry);
      const pending = games
        .disconnect(socket.data.identity.user.id, socket.data.token)
        .catch(() => {})
        .finally(() => disconnects.delete(pending));
      disconnects.add(pending);
    });
    void games
      .status(socket.data.identity.user.id)
      .then(async ({ gameId }) => {
        if (gameId) socket.data.gameId = gameId;
        await games.touch(socket.data.identity.user.id, socket.data.token);
        await push(socket, true);
      })
      .catch((error) => socket.emit('game:error', safeError(error)));
  });
  const poll = setInterval(() => {
    if (stopping) return;
    for (const socket of io.sockets.sockets.values()) {
      if (Date.now() - socket.data.lastAuth >= 2000 && !socket.data.checking) {
        socket.data.checking = true;
        void auth
          .authenticate(socket.data.authorization)
          .then(() =>
            games.touch(socket.data.identity.user.id, socket.data.token),
          )
          .then(() => {
            socket.data.lastAuth = Date.now();
          })
          .catch((error) => {
            const failure = safeError(error);
            socket.emit('game:error', failure);
            if (['UNAUTHENTICATED', 'CONTROL_CONFLICT'].includes(failure.code))
              socket.disconnect(true);
          })
          .finally(() => {
            socket.data.checking = false;
          });
      }
      void push(socket);
    }
  }, 500);
  return {
    io,
    revoke(familyId) {
      for (const socket of io.sockets.sockets.values())
        if (socket.data.identity.familyId === familyId) {
          socket.emit('game:error', {
            code: 'UNAUTHENTICATED',
            message: 'Your session ended.',
          });
          socket.disconnect(true);
        }
    },
    async close() {
      stopping = true;
      clearInterval(poll);
      await new Promise((resolve) => io.close(resolve));
      await Promise.allSettled([...disconnects]);
    },
  };
}
