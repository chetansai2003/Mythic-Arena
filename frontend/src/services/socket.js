import { io } from 'socket.io-client';
import {
  snapshotSchema,
  acceptedEventSchema,
  serverEventSchemas,
} from '@mythic/shared';

export function createOnlineClient({
  getSession,
  refreshSession,
  socketFactory = io,
}) {
  let clientId;
  try {
    clientId = sessionStorage.getItem('mythic.controlClientId');
  } catch {
    /* In-memory identity still permits reconnect. */
  }
  if (!clientId) {
    clientId = crypto.randomUUID();
    try {
      sessionStorage.setItem('mythic.controlClientId', clientId);
    } catch {
      /* Optional tab identity. */
    }
  }
  let takeover = false;
  let stopped = false;
  let blocked = false;
  let desiredGameId = null;
  let pending = null;
  let refreshing = false;
  let state = {
    snapshot: null,
    connection: 'connecting',
    queue: { status: 'IDLE', queuedAt: null },
    found: null,
    events: [],
    error: null,
  };
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, events: [], ...patch };
    for (const listener of listeners) listener(state);
  };
  const socket = socketFactory({
    autoConnect: false,
    forceNew: true,
    // Browser WebSocket handshakes always carry Origin, including same-origin
    // connections, so the server can enforce its strict origin allowlist.
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    auth: (callback) =>
      callback({
        accessToken: getSession().accessToken ?? '',
        clientId,
        takeover,
      }),
  });
  function fail(error, connection = 'rejected') {
    publish({
      connection,
      error: {
        code: error?.code ?? 'DEPENDENCY_UNAVAILABLE',
        message:
          error?.message ??
          'Connection unavailable. Restore the board to continue.',
      },
    });
  }
  function request(event, payload) {
    return new Promise((resolve) => {
      if (!socket.connected) {
        fail(
          { message: 'Disconnected. Reconnect to restore server state.' },
          'disconnected',
        );
        resolve({ ok: false });
        return;
      }
      socket.timeout(5000).emit(event, payload, (error, ack) => {
        if (error) {
          fail(
            {
              message:
                'No acknowledgement arrived. The operation may have completed; restore the board.',
            },
            'unknown',
          );
          resolve({ ok: false, unknown: true });
        } else if (!ack?.ok) {
          fail(ack?.error);
          resolve(ack);
        } else {
          resolve(ack);
        }
      });
    });
  }
  async function retryPending() {
    if (!pending || !socket.connected || pending.sending) return;
    const entry = pending;
    entry.sending = true;
    publish({ connection: 'pending', error: null });
    const ack = await request('game:command', entry.command);
    entry.sending = false;
    if (ack?.unknown) return;
    if (pending === entry) pending = null;
    if (ack?.ok) publish({ connection: 'ready', error: null });
    else if (ack?.error?.code === 'STALE_VERSION') await resync();
    return ack;
  }
  async function reconnect(expired = false) {
    if (stopped || blocked || refreshing) return;
    refreshing = true;
    publish({ connection: 'connecting' });
    try {
      if (
        expired ||
        !getSession().accessToken ||
        getSession().expiresAt <= Date.now() + 1000
      )
        await refreshSession();
      if (!stopped && getSession().accessToken) socket.connect();
      else if (!stopped)
        fail(
          {
            code: 'UNAUTHENTICATED',
            message: 'Sign in again to restore your match.',
          },
          'disconnected',
        );
    } catch {
      if (!stopped)
        fail(
          {
            message: 'Could not refresh your session. Reconnect to try again.',
          },
          'disconnected',
        );
    } finally {
      refreshing = false;
    }
  }
  async function resync() {
    if (!socket.connected) {
      await reconnect();
      return;
    }
    publish({ connection: 'resyncing', error: null });
    const gameId = desiredGameId ?? state.snapshot?.gameId;
    const ack = gameId
      ? await request('state:request', {
          gameId,
          ...(state.snapshot ? { knownVersion: state.snapshot.version } : {}),
        })
      : { ok: true };
    if (ack?.ok) {
      if (pending) await retryPending();
      else publish({ connection: 'ready', error: null });
    }
  }
  socket.on('connect', () => {
    takeover = false;
    publish({ connection: 'resyncing', error: null });
    void resync();
  });
  socket.on('disconnect', (reason) => {
    if (stopped || blocked) return;
    fail(
      {
        message:
          'Connection lost. Server turns continue; reconnect within 30 seconds.',
      },
      'disconnected',
    );
    if (reason === 'io server disconnect') void reconnect(true);
  });
  socket.on('connect_error', (error) => {
    if (error.data?.code === 'CONTROL_CONFLICT') {
      blocked = true;
      fail(error.data, 'conflict');
    } else {
      fail(
        error.data ?? {
          message: 'Online connection unavailable. Reconnect to try again.',
        },
        'disconnected',
      );
      if (error.data?.code === 'UNAUTHENTICATED') void reconnect(true);
    }
  });
  socket.on('queue:state', (input) => {
    const parsed = serverEventSchemas['queue:state'].safeParse(input);
    if (parsed.success) publish({ queue: parsed.data });
  });
  socket.on('match:found', (input) => {
    const parsed = serverEventSchemas['match:found'].safeParse(input);
    if (parsed.success) {
      desiredGameId = parsed.data.gameId;
      publish({ found: parsed.data });
    }
  });
  socket.on('game:state', (input) => {
    const parsed = snapshotSchema.safeParse(input);
    if (!parsed.success) {
      fail(
        { message: 'An invalid snapshot was rejected. Restore the board.' },
        'unavailable',
      );
      return;
    }
    const snapshot = parsed.data;
    if (desiredGameId && desiredGameId !== snapshot.gameId) return;
    if (
      state.snapshot?.gameId === snapshot.gameId &&
      snapshot.version < state.snapshot.version
    )
      return;
    const gap =
      state.snapshot?.gameId === snapshot.gameId &&
      snapshot.version > state.snapshot.version + 1;
    publish({
      snapshot,
      connection: pending ? 'pending' : 'ready',
      error: null,
      ...(snapshot.status === 'TERMINAL' ? { found: null } : {}),
    });
    if (gap) void resync();
  });
  socket.on('game:event', (input) => {
    const parsed = acceptedEventSchema.safeParse(input);
    if (
      parsed.success &&
      parsed.data.gameId === state.snapshot?.gameId &&
      parsed.data.version === state.snapshot.version
    )
      publish({ events: [parsed.data] });
  });
  socket.on('game:error', (error) => {
    if (error.code === 'CONTROL_CONFLICT') {
      blocked = true;
      fail(error, 'conflict');
    } else
      fail(
        error,
        error.code === 'UNAUTHENTICATED' ? 'disconnected' : 'unavailable',
      );
  });
  void reconnect();
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    async join(deckId) {
      desiredGameId = null;
      publish({ connection: 'pending', found: null, error: null });
      const ack = await request('queue:join', { deckId, mode: 'CASUAL' });
      if (ack?.ok) publish({ connection: 'ready' });
      return ack;
    },
    async leave() {
      const ack = await request('queue:leave', {});
      if (ack?.ok) publish({ connection: 'ready' });
      return ack;
    },
    async ready(gameId) {
      publish({ connection: 'pending', error: null });
      const ack = await request('match:ready', { gameId });
      if (ack?.ok) publish({ connection: 'ready' });
      return ack;
    },
    async watch(gameId) {
      desiredGameId = gameId;
      await resync();
    },
    async send(command) {
      if (pending || !socket.connected) return;
      pending = { command, sending: false };
      return retryPending();
    },
    resync,
    takeControl() {
      blocked = false;
      takeover = true;
      void reconnect();
    },
    dispose() {
      stopped = true;
      listeners.clear();
      socket.disconnect();
    },
  };
}
