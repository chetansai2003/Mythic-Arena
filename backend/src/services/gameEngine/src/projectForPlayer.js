import { snapshotSchema } from '@mythic/shared';
import { assertTime } from './createMatch.js';

export function projectForPlayer(state, playerId, now) {
  assertTime(now);
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Only participants may receive a snapshot');
  const opponent = state.players.find((p) => p.id !== playerId);
  const publicPlayer = (p) => ({
    id: p.id,
    displayName: p.displayName,
    health: p.health,
    maxHealth: p.maxHealth,
    energy: p.energy,
    maxEnergy: p.maxEnergy,
    shield: p.shield,
    connected: p.connected,
    deckCount: p.deck.length,
    board: p.board.map((u) => ({
      instanceId: u.instanceId,
      definitionId: u.definitionId,
      attack: u.attack,
      health: u.health,
      maxHealth: u.maxHealth,
      guard: u.guard,
      shield: u.shield,
      canAttack: u.canAttack,
    })),
  });
  // Explicit allowlist: never spread internal players or state into a wire object.
  return snapshotSchema.parse({
    gameId: state.gameId,
    rulesVersion: state.rulesVersion,
    version: state.version,
    status: state.status,
    serverNow: now,
    readyEndsAt: state.readyEndsAt,
    turn: state.turn,
    self: { ...publicPlayer(player), hand: player.hand },
    opponent: { ...publicPlayer(opponent), handCount: opponent.hand.length },
    outcome: state.outcome,
    resultStatus: state.resultStatus,
  });
}
