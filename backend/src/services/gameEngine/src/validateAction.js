import { commandSchema, LIMITS } from '@mythic/shared';
import { findTarget } from './rules.js';

const invalid = (message, code = 'ILLEGAL_ACTION') => ({ ok: false, error: { code, message } });

export function validateAction(state, actorId, input) {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return invalid('Invalid command.', 'INVALID_PAYLOAD');
  const action = parsed.data;
  if (action.gameId !== state.gameId) return invalid('Match not found.', 'NOT_FOUND');
  const player = state.players.find((p) => p.id === actorId);
  if (!player) return invalid('You are not a participant.', 'FORBIDDEN');
  if (state.status !== 'ACTIVE') return invalid('This match is not active.', 'NOT_READY');
  if (action.expectedVersion !== state.version) return { ok: false, error: { code: 'STALE_VERSION', message: 'The board changed. Restore the latest state.', latestVersion: state.version } };
  if (action.type === 'SURRENDER') return { ok: true, action };
  if (state.turn.playerId !== actorId) return invalid('Wait for your turn.');
  if (action.type === 'END_TURN') return { ok: true, action };
  const target = findTarget(state, action.payload.target);
  if (action.type === 'PLAY_CARD') {
    const card = player.hand.find((c) => c.instanceId === action.payload.cardInstanceId);
    if (!card) return invalid('Select a card from your hand.');
    if (player.energy < card.definition.cost) return invalid('Not enough energy.');
    if (card.definition.kind === 'UNIT') {
      if (action.payload.target) return invalid('Units enter your board without a target.');
      if (player.board.length >= LIMITS.board) return invalid('Your five unit slots are full.');
    } else {
      if (!target || target.character.health <= 0) return invalid('Select a living target.');
      const friendly = card.definition.effect.target === 'FRIENDLY_CHARACTER';
      if ((target.owner.id === actorId) !== friendly) return invalid(friendly ? 'Choose your hero or a friendly unit.' : 'Choose the enemy hero or an enemy unit.');
    }
  } else {
    const attacker = player.board.find((unit) => unit.instanceId === action.payload.attackerId);
    if (!attacker) return invalid('Select one of your units.');
    if (!attacker.canAttack) return invalid('This unit must wait until your next turn.');
    if (!target || target.owner.id === actorId || target.character.health <= 0) return invalid('Choose an enemy target.');
    if (target.owner.board.some((unit) => unit.guard) && !target.character.guard) return invalid('Attack an enemy Guard first.');
  }
  return { ok: true, action };
}
