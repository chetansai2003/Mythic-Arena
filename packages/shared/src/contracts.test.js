import { describe, expect, it } from 'vitest';
import {
  cardDefinitionSchema,
  commandSchema,
  clientEventSchemas,
  playableDeckSchema,
  draftDeckSchema,
  snapshotSchema,
  effectSchema,
  serverEventSchemas,
  acknowledgementSchema,
} from './index.js';
import { snapshotFixture, unitFixture } from './fixtures.js';

const command = {
  gameId: 'game_1',
  actionId: 'f50ca4f2-92c1-41f1-9d73-044c1ab96fca',
  expectedVersion: 0,
  type: 'END_TURN',
  payload: {},
};
describe('untrusted command boundary', () => {
  it('accepts each valid command variant', () => {
    for (const value of [
      command,
      { ...command, type: 'SURRENDER' },
      { ...command, type: 'PLAY_CARD', payload: { cardInstanceId: 'ci_1' } },
      {
        ...command,
        type: 'ATTACK',
        payload: {
          attackerId: 'ci_2',
          target: { kind: 'HERO', playerId: 'p2' },
        },
      },
    ])
      expect(commandSchema.safeParse(value).success).toBe(true);
  });
  it.each([
    { ...command, userId: 'victim' },
    { ...command, expectedVersion: -1 },
    { ...command, type: 'TURN_EXPIRED' },
    { ...command, payload: { health: 0 } },
    { ...command, actionId: 'anything' },
    { ...command, type: 'ATTACK', payload: {} },
  ])(
    'rejects forged identity, unknown data, invalid counters and variants',
    (value) => expect(commandSchema.safeParse(value).success).toBe(false),
  );
  it('permits casual queue only and rejects injected identity', () => {
    expect(
      clientEventSchemas['queue:join'].safeParse({
        mode: 'CASUAL',
        deckId: 'd1',
      }).success,
    ).toBe(true);
    expect(
      clientEventSchemas['queue:join'].safeParse({
        mode: 'RANKED',
        deckId: 'd1',
      }).success,
    ).toBe(false);
    expect(
      clientEventSchemas['queue:leave'].safeParse({ userId: 'p1' }).success,
    ).toBe(false);
  });
});
describe('deck and content contract', () => {
  const cards = Array.from({ length: 15 }, (_, i) => [
    `card_${i}`,
    `card_${i}`,
  ]).flat();
  it('distinguishes editable drafts from playable decks', () => {
    expect(
      draftDeckSchema.safeParse({ name: 'Draft', cardIds: [] }).success,
    ).toBe(true);
    expect(
      playableDeckSchema.safeParse({ name: 'Complete', cardIds: cards })
        .success,
    ).toBe(true);
    for (const cardIds of [
      cards.slice(1),
      [...cards, 'extra'],
      Array(30).fill('same'),
    ])
      expect(
        playableDeckSchema.safeParse({ name: 'Invalid', cardIds }).success,
      ).toBe(false);
  });
  it('accepts defined effects only and enforces finite target policies', () => {
    expect(cardDefinitionSchema.safeParse(unitFixture).success).toBe(true);
    expect(
      effectSchema.safeParse({
        key: 'DAMAGE',
        amount: 3,
        target: 'ENEMY_CHARACTER',
      }).success,
    ).toBe(true);
    expect(
      effectSchema.safeParse({ key: 'EXECUTE', code: 'process.exit()' })
        .success,
    ).toBe(false);
    expect(
      effectSchema.safeParse({
        key: 'SHIELD',
        amount: 3,
        target: 'ENEMY_CHARACTER',
      }).success,
    ).toBe(false);
  });
});
describe('private snapshot boundary', () => {
  it('accepts a player-safe snapshot', () =>
    expect(snapshotSchema.parse(snapshotFixture()).opponent.handCount).toBe(5));
  it.each(['hand', 'deck', 'seed', 'hiddenIds'])(
    'rejects opponent %s',
    (field) => {
      const snapshot = snapshotFixture();
      snapshot.opponent[field] = [];
      expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
    },
  );
  it('rejects root seed and nested hidden information', () => {
    const snapshot = snapshotFixture();
    snapshot.seed = 'secret';
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
    delete snapshot.seed;
    snapshot.self.hand[0].definition.internalEffectCode = 'secret';
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
  });
  it('rejects invalid lifecycle and resource state', () => {
    for (const change of [
      { turn: null },
      { outcome: { kind: 'DRAW', reason: 'TURN_LIMIT' } },
      { resultStatus: 'PERSISTED' },
    ])
      expect(
        snapshotSchema.safeParse({ ...snapshotFixture(), ...change }).success,
      ).toBe(false);
    const snapshot = snapshotFixture();
    snapshot.self.energy = 3;
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
  });
  it('defines strict safe events and acknowledgements', () => {
    expect(
      serverEventSchemas['game:event'].safeParse({
        eventId: 'e1',
        gameId: 'g1',
        version: 1,
        actionId: null,
        type: 'TURN_STARTED',
        occurredAt: 1000,
      }).success,
    ).toBe(true);
    expect(
      acknowledgementSchema.safeParse({
        ok: false,
        error: {
          code: 'STALE_VERSION',
          message: 'Request a fresh snapshot',
          latestVersion: 2,
        },
      }).success,
    ).toBe(true);
  });
});
