import { expect, it } from 'vitest';
import { createPracticeTransport } from './practice.js';
import { cardDefinitionSchema } from '@mythic/shared';

export const testCatalog = Array.from({ length: 15 }, (_, n) =>
  cardDefinitionSchema.parse({
    id: `unit_${n}`,
    name: `Test Unit ${n}`,
    faction: 'NORSE',
    rarity: 'COMMON',
    cost: 1,
    version: 1,
    rulesVersion: '1',
    artRef: null,
    kind: 'UNIT',
    attack: 2,
    health: 2,
    keywords: [],
  }),
);

it('publishes pending, rejection and restored snapshots without exposing private state', async () => {
  const adapter = createPracticeTransport({
    cards: testCatalog,
    seed: 'test',
    now: () => 1000,
    id: () => 'test_game',
  });
  const states = [];
  const unsubscribe = adapter.subscribe((feed) => states.push(feed));
  const initial = adapter.getSnapshot().snapshot;
  const result = await adapter.send({
    gameId: initial.gameId,
    actionId: '00000000-0000-4000-8000-000000000000',
    expectedVersion: 100,
    type: 'END_TURN',
    payload: {},
  });
  expect(result.ok).toBe(false);
  expect(states.map((s) => s.connection)).toEqual([
    'ready',
    'pending',
    'rejected',
  ]);
  expect(states.at(-1).snapshot).toEqual(initial);
  await adapter.resync();
  expect(states.slice(-2).map((s) => s.connection)).toEqual([
    'resyncing',
    'ready',
  ]);
  expect(JSON.stringify(states)).not.toMatch(
    /"seed"|"discard"|"deck":|"fatigue"/,
  );
  expect(states.at(-1).snapshot.opponent.hand).toBeUndefined();
  unsubscribe();
  adapter.dispose();
});

it('deduplicates an in-flight send and disposal cancels unfinished local work', async () => {
  const adapter = createPracticeTransport({
    cards: testCatalog,
    seed: 'test',
    now: () => 1000,
    id: () => 'test_game',
  });
  const initial = adapter.getSnapshot().snapshot;
  const command = {
    gameId: initial.gameId,
    actionId: '00000000-0000-4000-8000-000000000000',
    expectedVersion: 0,
    type: 'SURRENDER',
    payload: {},
  };
  const pending = adapter.send(command);
  expect(await adapter.send(command)).toBeUndefined();
  await pending;
  expect(adapter.getSnapshot().snapshot.version).toBe(1);
  expect(adapter.getSnapshot().snapshot.outcome.reason).toBe('SURRENDER');
  adapter.dispose();
  expect(await adapter.send(command)).toBeUndefined();
});
