import { validateAction } from './validateAction.js';

export function legalActions(
  state,
  actorId,
  actionId = `00000000-0000-4000-8000-${String(state.version).padStart(12, '0')}`,
) {
  if (state.status !== 'ACTIVE' || state.turn.playerId !== actorId) return [];
  const player = state.players.find((p) => p.id === actorId);
  if (!player) return [];
  const targets = state.players.flatMap((p) => [
    { kind: 'HERO', playerId: p.id },
    ...p.board.map((u) => ({ kind: 'UNIT', instanceId: u.instanceId })),
  ]);
  const command = (type, payload) => ({
    gameId: state.gameId,
    actionId,
    expectedVersion: state.version,
    type,
    payload,
  });
  const candidates = [];
  for (const card of player.hand) {
    if (card.definition.kind === 'UNIT')
      candidates.push(
        command('PLAY_CARD', { cardInstanceId: card.instanceId }),
      );
    else
      for (const target of targets)
        candidates.push(
          command('PLAY_CARD', { cardInstanceId: card.instanceId, target }),
        );
  }
  for (const unit of player.board)
    for (const target of targets)
      candidates.push(
        command('ATTACK', { attackerId: unit.instanceId, target }),
      );
  return [...candidates, command('END_TURN', {})].filter(
    (action) => validateAction(state, actorId, action).ok,
  );
}

export function chooseBotAction(state, actorId) {
  const actions = legalActions(state, actorId);
  const player = state.players.find((p) => p.id === actorId);
  // Decisions use only this player's hand and public board/hero information.
  const score = (action) => {
    if (action.type === 'END_TURN') return -1;
    if (action.type === 'ATTACK')
      return action.payload.target.kind === 'HERO' ? 100 : 80;
    const definition = player.hand.find(
      (c) => c.instanceId === action.payload.cardInstanceId,
    ).definition;
    if (definition.kind === 'UNIT') return 70 + definition.cost;
    if (definition.effect.key === 'DAMAGE')
      return action.payload.target.kind === 'HERO' ? 95 : 60;
    if (definition.effect.key === 'HEAL') {
      const target =
        action.payload.target.kind === 'HERO'
          ? player
          : player.board.find(
              (u) => u.instanceId === action.payload.target.instanceId,
            );
      return target.health < target.maxHealth ? 50 : -2;
    }
    const target =
      action.payload.target.kind === 'HERO'
        ? player
        : player.board.find(
            (u) => u.instanceId === action.payload.target.instanceId,
          );
    return target.shield ? -2 : 40;
  };
  return actions.sort((a, b) => score(b) - score(a))[0] ?? null;
}
