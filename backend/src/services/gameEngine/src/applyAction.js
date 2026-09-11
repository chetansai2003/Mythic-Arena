import { assertTime } from './createMatch.js';
import { validateAction } from './validateAction.js';
import {
  damage,
  determineOutcome,
  findTarget,
  finish,
  nextTurn,
  removeDeaths,
} from './rules.js';
import { EFFECT_HANDLERS } from './registry.js';

function event(state, type, now, actionId = null) {
  return {
    eventId: `event_${state.version}`,
    gameId: state.gameId,
    version: state.version,
    actionId,
    type,
    occurredAt: now,
  };
}

export function advanceTurn(state, now) {
  assertTime(now);
  if (now < state.updatedAt) throw new Error('Time cannot move backwards');
  if (state.status !== 'ACTIVE') return { state, events: [] };
  const next = structuredClone(state);
  nextTurn(next, now);
  next.version++;
  next.updatedAt = now;
  return {
    state: next,
    events: [event(next, next.outcome ? 'MATCH_ENDED' : 'TURN_STARTED', now)],
  };
}

export function advanceTime(state, now) {
  assertTime(now);
  if (now < state.updatedAt) throw new Error('Time cannot move backwards');
  const events = [];
  let next = state;
  while (next.status === 'ACTIVE' && now >= next.turn.endsAt) {
    const result = advanceTurn(next, next.turn.endsAt);
    next = result.state;
    events.push(...result.events);
  }
  return { state: next, events };
}

export function applyAction(state, actorId, input, now) {
  const elapsed = advanceTime(state, now);
  const validation = validateAction(elapsed.state, actorId, input);
  if (!validation.ok) return { ...validation, ...elapsed };
  const action = validation.action;
  const next = structuredClone(elapsed.state);
  const player = next.players.find((p) => p.id === actorId);
  const opponent = next.players.find((p) => p.id !== actorId);
  let type;
  if (action.type === 'SURRENDER') {
    finish(next, { kind: 'WIN', winnerId: opponent.id, reason: 'SURRENDER' });
  } else if (action.type === 'END_TURN') {
    nextTurn(next, now);
    type = 'TURN_STARTED';
  } else if (action.type === 'PLAY_CARD') {
    const index = player.hand.findIndex(
      (c) => c.instanceId === action.payload.cardInstanceId,
    );
    const card = player.hand.splice(index, 1)[0];
    const definition = card.definition;
    player.energy -= definition.cost;
    if (definition.kind === 'UNIT') {
      player.board.push({
        instanceId: card.instanceId,
        definitionId: definition.id,
        definition,
        attack: definition.attack,
        health: definition.health,
        maxHealth: definition.health,
        guard: definition.keywords.includes('GUARD'),
        shield: definition.keywords.includes('SHIELD'),
        canAttack: false,
      });
    } else {
      EFFECT_HANDLERS[definition.effect.key](
        findTarget(next, action.payload.target).character,
        definition.effect,
      );
      player.discard.push(card);
    }
    type = 'CARD_PLAYED';
  } else {
    const attacker = player.board.find(
      (u) => u.instanceId === action.payload.attackerId,
    );
    const target = findTarget(next, action.payload.target).character;
    const retaliation =
      action.payload.target.kind === 'UNIT' ? target.attack : 0;
    damage(target, attacker.attack);
    damage(attacker, retaliation);
    attacker.canAttack = false;
    type = 'ATTACK_RESOLVED';
  }
  removeDeaths(next);
  finish(next, determineOutcome(next));
  next.version++;
  next.updatedAt = now;
  return {
    ok: true,
    state: next,
    events: [
      ...elapsed.events,
      event(next, next.outcome ? 'MATCH_ENDED' : type, now, action.actionId),
    ],
  };
}
