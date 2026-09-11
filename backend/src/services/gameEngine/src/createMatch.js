import {
  cardInstanceSchema,
  idSchema,
  LIMITS,
  playableDeckSchema,
  RULES_VERSION,
} from '@mythic/shared';
import { assertDeclaredBehavior } from './registry.js';
import { beginTurn } from './rules.js';

export function seededRandom(seed) {
  let value = 2166136261;
  for (const char of String(seed))
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function assertTime(now) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    now > Number.MAX_SAFE_INTEGER - LIMITS.turnMs * LIMITS.turns
  )
    throw new Error('Time must be a safe nonnegative millisecond timestamp');
}

export function createMatch({ gameId, players, seed, now }) {
  idSchema.parse(gameId);
  assertTime(now);
  if (
    !['string', 'number'].includes(typeof seed) ||
    (typeof seed === 'number' && !Number.isFinite(seed))
  )
    throw new Error('Provide a deterministic seed');
  if (
    !Array.isArray(players) ||
    players.length !== 2 ||
    players[0].id === players[1].id
  )
    throw new Error('Two distinct players are required');
  const random = seededRandom(seed);
  const instanceIds = new Set();
  const definitions = new Map();
  const prepared = players.map((player) => {
    idSchema.parse(player.id);
    if (
      typeof player.displayName !== 'string' ||
      !player.displayName.trim() ||
      player.displayName.length > 40
    )
      throw new Error('Invalid display name');
    const deck = player.cards.map((card) => cardInstanceSchema.parse(card));
    playableDeckSchema.parse({
      name: 'Frozen deck',
      cardIds: deck.map((card) => card.definition.id),
    });
    for (const card of deck) {
      assertDeclaredBehavior(card.definition);
      if (instanceIds.has(card.instanceId))
        throw new Error('Card instance IDs must be globally unique');
      instanceIds.add(card.instanceId);
      const serialized = JSON.stringify(card.definition);
      if (
        definitions.has(card.definition.id) &&
        definitions.get(card.definition.id) !== serialized
      )
        throw new Error('Conflicting frozen card definitions');
      definitions.set(card.definition.id, serialized);
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return {
      id: player.id,
      displayName: player.displayName,
      health: LIMITS.health,
      maxHealth: LIMITS.health,
      energy: 0,
      maxEnergy: 0,
      shield: false,
      connected: true,
      hand: deck.splice(0, LIMITS.openingHand),
      deck,
      board: [],
      discard: [],
      fatigue: 0,
    };
  });
  const state = {
    gameId,
    rulesVersion: RULES_VERSION,
    seed,
    version: 0,
    status: 'ACTIVE',
    readyEndsAt: null,
    turn: null,
    players: prepared,
    outcome: null,
    resultStatus: 'NONE',
    updatedAt: now,
  };
  beginTurn(state, prepared[Math.floor(random() * 2)].id, 1, now);
  return state;
}
