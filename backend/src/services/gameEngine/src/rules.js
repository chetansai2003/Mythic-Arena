import { LIMITS } from '@mythic/shared';

// These helpers mutate only the private candidate owned by applyAction/advanceTurn.
export function damage(target, amount) {
  if (amount <= 0) return;
  if (target.shield) target.shield = false;
  else target.health -= amount;
}

export function resolveDeaths(state) {
  const next = structuredClone(state);
  removeDeaths(next);
  return next;
}

export function removeDeaths(state) {
  for (const player of state.players) {
    const dead = player.board.filter((unit) => unit.health <= 0);
    player.discard.push(...dead.map(({ instanceId, definition }) => ({ instanceId, definition })));
    player.board = player.board.filter((unit) => unit.health > 0);
  }
}

export function determineOutcome(state) {
  if (state.outcome) return structuredClone(state.outcome);
  const dead = state.players.filter((player) => player.health <= 0);
  if (dead.length === 2) return { kind: 'DRAW', reason: 'SIMULTANEOUS_DEFEAT' };
  if (dead.length === 1) return { kind: 'WIN', winnerId: state.players.find((p) => p.id !== dead[0].id).id, reason: 'DEFEAT' };
  return null;
}

export function finish(state, outcome) {
  if (!outcome) return;
  state.status = 'TERMINAL';
  state.outcome = outcome;
  state.turn = null;
  state.readyEndsAt = null;
  state.resultStatus = 'PENDING';
}

export function draw(state, player) {
  const card = player.deck.shift();
  if (!card) damage(player, ++player.fatigue);
  else if (player.hand.length >= LIMITS.hand) player.discard.push(card);
  else player.hand.push(card);
  finish(state, determineOutcome(state));
}

export function beginTurn(state, playerId, number, now) {
  const player = state.players.find((p) => p.id === playerId);
  state.turn = { number, playerId, endsAt: now + LIMITS.turnMs };
  player.maxEnergy = Math.min(LIMITS.energy, player.maxEnergy + 1);
  player.energy = player.maxEnergy;
  for (const unit of player.board) unit.canAttack = true;
  if (number !== 1) draw(state, player);
}

export function nextTurn(state, now) {
  finish(state, determineOutcome(state));
  if (state.status !== 'ACTIVE') return;
  if (state.turn.number === LIMITS.turns) {
    finish(state, { kind: 'DRAW', reason: 'TURN_LIMIT' });
    return;
  }
  const opponent = state.players.find((p) => p.id !== state.turn.playerId);
  beginTurn(state, opponent.id, state.turn.number + 1, now);
}

export function findTarget(state, target) {
  if (!target) return null;
  for (const player of state.players) {
    if (target.kind === 'HERO' && target.playerId === player.id) return { owner: player, character: player };
    if (target.kind === 'UNIT') {
      const unit = player.board.find((u) => u.instanceId === target.instanceId);
      if (unit) return { owner: player, character: unit };
    }
  }
  return null;
}
