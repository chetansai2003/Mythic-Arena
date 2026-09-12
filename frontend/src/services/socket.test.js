import { afterEach, expect, it, vi } from 'vitest';
import { snapshotFixture } from '../../../packages/shared/src/fixtures.js';
import { createOnlineClient } from './socket.js';

let client;
const command = (state, type) => ({
  gameId: state.gameId,
  expectedVersion: state.version,
  actionId: crypto.randomUUID(),
  type,
  payload: {},
});
afterEach(() => client?.dispose());
function harness() {
  const handlers = new Map();
  const requests = [];
  const socket = {
    connected: false,
    on: (event, handler) => handlers.set(event, handler),
    connect: vi.fn(() => {
      socket.connected = true;
      handlers.get('connect')();
    }),
    disconnect: () => {
      socket.connected = false;
    },
    timeout: () => socket,
    emit: (event, payload, ack) => requests.push({ event, payload, ack }),
  };
  client = createOnlineClient({
    getSession: () => ({
      accessToken: 'in-memory',
      expiresAt: Date.now() + 60000,
    }),
    refreshSession: vi.fn(),
    socketFactory: () => socket,
  });
  const initial = snapshotFixture();
  const snapshot = initial;
  return {
    socket,
    requests,
    initial,
    snapshot,
    receive: (event, value) => handlers.get(event)(value),
  };
}

it('retains the original action ID after a lost acknowledgement and restores before retry', async () => {
  const { requests, initial, snapshot, receive } = harness();
  receive('game:state', snapshot);
  const input = command(initial, 'END_TURN');
  const sending = client.send(input);
  requests[0].ack(new Error('Lost acknowledgement'));
  await sending;
  expect(client.getSnapshot().connection).toBe('unknown');
  const resync = client.resync();
  expect(requests[1].event).toBe('state:request');
  requests[1].ack(null, { ok: true });
  await vi.waitFor(() => expect(requests).toHaveLength(3));
  expect(requests[2].payload).toEqual(input);
  requests[2].ack(null, { ok: true });
  await resync;
  expect(client.getSnapshot().connection).toBe('ready');
});

it('discards old snapshots and requests resync for a version gap', () => {
  const { snapshot, requests, receive } = harness();
  receive('game:state', { ...snapshot, version: 5 });
  receive('game:state', { ...snapshot, version: 4 });
  expect(client.getSnapshot().snapshot.version).toBe(5);
  receive('game:state', { ...snapshot, version: 8 });
  expect(requests.at(-1).event).toBe('state:request');
  expect(client.getSnapshot().events).toEqual([]);
});

it('blocks offline actions and requires explicit takeover after a controller conflict', () => {
  const { socket, requests, initial, receive } = harness();
  socket.connected = false;
  void client.send(command(initial, 'END_TURN'));
  expect(requests).toHaveLength(0);
  receive('connect_error', {
    data: {
      code: 'CONTROL_CONFLICT',
      message: 'Another tab controls this account.',
    },
  });
  void client.resync();
  expect(socket.connect).toHaveBeenCalledTimes(1);
  client.takeControl();
  expect(socket.connect).toHaveBeenCalledTimes(2);
});
