import {
  applyAction,
  advanceTime,
  chooseBotAction,
  createMatch,
  projectForPlayer,
} from '@mythic/game-engine';

export function createPracticeTransport({
  cards,
  cardIds,
  seed,
  now = Date.now,
  id = () => crypto.randomUUID(),
}) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const starter = cards.slice(0, 15).flatMap((card) => [card.id, card.id]);
  const deck = (ids, owner) =>
    ids.map((definitionId, index) => {
      const definition = byId.get(definitionId);
      if (!definition)
        throw new Error(
          'This deck contains an unavailable card. Choose another deck.',
        );
      return { instanceId: `${owner}_${index}`, definition };
    });
  const playerId = 'practice_player';
  const botId = 'practice_bot';
  let state = createMatch({
    gameId: id(),
    seed,
    now: now(),
    players: [
      {
        id: playerId,
        displayName: 'You',
        cards: deck(cardIds ?? starter, 'you'),
      },
      {
        id: botId,
        displayName: 'Arena apprentice',
        cards: deck(starter, 'bot'),
      },
    ],
  });
  let listeners = new Set();
  let disposed = false;
  let busy = false;
  let lastBotAt = 0;
  let current;
  function publish(connection = 'ready', events = [], error = null) {
    current = {
      snapshot: projectForPlayer(state, playerId, now()),
      connection,
      events,
      error,
    };
    for (const listener of listeners) listener(current);
    return current;
  }
  publish();
  return {
    getSnapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    async send(command) {
      if (disposed || busy) return;
      busy = true;
      publish('pending');
      try {
        await Promise.resolve();
        if (disposed) return;
        const result = applyAction(state, playerId, command, now());
        state = result.state;
        publish(
          result.ok ? 'ready' : 'rejected',
          result.events,
          result.ok ? null : result.error,
        );
        return { ok: result.ok, error: result.error };
      } finally {
        busy = false;
      }
    },
    async resync() {
      if (disposed || busy) return;
      publish('resyncing');
      await Promise.resolve();
      if (!disposed) {
        const result = advanceTime(state, now());
        state = result.state;
        publish();
      }
    },
    tick() {
      if (disposed || busy) return;
      const time = now();
      const result = advanceTime(state, time);
      state = result.state;
      let events = result.events;
      if (
        state.status === 'ACTIVE' &&
        state.turn.playerId === botId &&
        time - lastBotAt >= 650
      ) {
        lastBotAt = time;
        const action = chooseBotAction(state, botId);
        const move = applyAction(state, botId, action, time);
        state = move.state;
        events = [...events, ...move.events];
      }
      if (events.length) publish('ready', events);
    },
    dispose() {
      disposed = true;
      listeners = new Set();
    },
  };
}
