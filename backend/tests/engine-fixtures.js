import { CATALOG } from '../src/models/cards.js';
import { createMatch } from '@mythic/game-engine';

export const definitions = Object.fromEntries(
  CATALOG.map((card) => [card.id, card]),
);
export function instance(id, name = id) {
  return { instanceId: name, definition: structuredClone(definitions[id]) };
}
export function fixture(seed = 'rules-v1') {
  return createMatch({
    gameId: 'scenario',
    seed,
    now: 1000,
    players: ['alpha', 'beta'].map((id) => ({
      id,
      displayName: id,
      cards: CATALOG.slice(0, 15).flatMap((definition, n) =>
        [0, 1].map((copy) => ({
          instanceId: `${id}_${n}_${copy}`,
          definition,
        })),
      ),
    })),
  });
}
export function activeFixture() {
  const state = fixture();
  state.turn.playerId = 'alpha';
  state.players[0].energy = state.players[0].maxEnergy = 10;
  return state;
}
export function unit(id, name = id, extra = {}) {
  const definition = structuredClone(definitions[id]);
  return {
    instanceId: name,
    definitionId: id,
    definition,
    attack: definition.attack,
    health: definition.health,
    maxHealth: definition.health,
    guard: definition.keywords.includes('GUARD'),
    shield: definition.keywords.includes('SHIELD'),
    canAttack: true,
    ...extra,
  };
}
export const hero = (playerId) => ({ kind: 'HERO', playerId });
export const targetUnit = (instanceId) => ({ kind: 'UNIT', instanceId });
export function command(state, type, payload = {}) {
  return {
    gameId: state.gameId,
    actionId: `00000000-0000-4000-8000-${String(state.version).padStart(12, '0')}`,
    expectedVersion: state.version,
    type,
    payload,
  };
}
