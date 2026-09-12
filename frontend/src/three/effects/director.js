// Only public snapshots and accepted event IDs enter the presentation layer.
export function createEffectDirector({ now = Date.now } = {}) {
  const seen = new Set();
  let current;
  let previous;
  let anchor;
  return {
    consume(feed) {
      const snapshot = feed.snapshot;
      if (!snapshot) return null;
      if (current?.gameId !== snapshot.gameId) {
        current = null;
        previous = null;
        seen.clear();
        anchor = { local: now(), server: snapshot.serverNow };
      }
      if (!current || current.version !== snapshot.version) {
        previous = current;
        current = snapshot;
      }
      let cue = null;
      for (const event of feed.events ?? []) {
        if (seen.has(event.eventId)) continue;
        seen.add(event.eventId);
        if (seen.size > 128) seen.delete(seen.values().next().value);
        if (
          !previous ||
          event.gameId !== snapshot.gameId ||
          event.version !== snapshot.version ||
          snapshot.version !== previous.version + 1 ||
          Math.max(snapshot.serverNow, anchor.server + now() - anchor.local) -
            event.occurredAt >
            1200
        )
          continue;
        const added = [snapshot.self, snapshot.opponent]
          .flatMap((p) => p.board)
          .filter(
            (unit) =>
              ![previous.self, previous.opponent].some((p) =>
                p.board.some((old) => old.instanceId === unit.instanceId),
              ),
          );
        if (event.type === 'CARD_PLAYED')
          cue = {
            id: event.eventId,
            kind: added.length ? 'SUMMON' : 'SPELL',
            definitionId: added[0]?.definitionId,
          };
        if (event.type === 'ATTACK_RESOLVED')
          cue = { id: event.eventId, kind: 'IMPACT' };
        if (event.type === 'MATCH_ENDED')
          cue = { id: event.eventId, kind: 'FINISH' };
      }
      return cue;
    },
  };
}
