import { LIMITS } from '@mythic/shared';
import { advanceTurn } from '@mythic/game-engine';

export function deadlineOf(record) {
  if (record.kind === 'RESERVED') return record.createdAt;
  if (record.state.status === 'TERMINAL') return null;
  const times = [
    record.state.status === 'INITIALIZING'
      ? record.state.readyEndsAt
      : record.state.turn.endsAt,
  ];
  for (const presence of Object.values(record.presence))
    times.push(
      presence.connected ? presence.leaseEndsAt : presence.disconnectEndsAt,
    );
  return Math.min(...times.filter((time) => time !== null));
}

export function endMatch(record, outcome, now) {
  const state = record.state;
  if (state.status === 'TERMINAL') return;
  record.turns = state.turn?.number ?? 0;
  state.status = 'TERMINAL';
  state.outcome = outcome;
  state.turn = null;
  state.readyEndsAt = null;
  state.resultStatus = 'PENDING';
  state.version++;
  state.updatedAt = now;
  record.endedAt = now;
  record.events = [
    {
      eventId: `event_${state.version}`,
      gameId: state.gameId,
      version: state.version,
      actionId: null,
      type: 'MATCH_ENDED',
      occurredAt: now,
    },
  ];
}

export function settleDeadlines(record, now) {
  if (record.kind === 'RESERVED' || record.state.status === 'TERMINAL')
    return false;
  let changed = false;
  // Presence expiration is derived from durable leases, never process-local timers.
  while (record.state.status !== 'TERMINAL' && deadlineOf(record) <= now) {
    const due = deadlineOf(record);
    for (const [id, presence] of Object.entries(record.presence)) {
      if (presence.connected && presence.leaseEndsAt <= due) {
        presence.connected = false;
        presence.disconnectEndsAt = presence.leaseEndsAt + LIMITS.reconnectMs;
        record.state.players.find((p) => p.id === id).connected = false;
        record.state.version++;
        changed = true;
      }
    }
    if (record.state.status === 'INITIALIZING') {
      if (record.state.readyEndsAt <= due) {
        endMatch(record, { kind: 'ABORT', reason: 'NOT_READY' }, due);
        changed = true;
      } else {
        // Offline readiness still ends at the ten-second reservation boundary.
        for (const p of Object.values(record.presence))
          if (!p.connected && p.disconnectEndsAt <= due)
            p.disconnectEndsAt = record.state.readyEndsAt;
      }
    } else {
      const expired = Object.entries(record.presence).filter(
        ([, p]) => !p.connected && p.disconnectEndsAt <= due,
      );
      if (expired.length) {
        const offline = Object.entries(record.presence).filter(
          ([, p]) => !p.connected,
        );
        const outcome =
          offline.length === 2
            ? { kind: 'ABORT', reason: 'BOTH_OFFLINE' }
            : {
                kind: 'WIN',
                winnerId: record.state.players.find(
                  (p) => p.id !== expired[0][0],
                ).id,
                reason: 'DISCONNECT',
              };
        endMatch(record, outcome, due);
        changed = true;
      } else if (record.state.turn.endsAt <= due) {
        const result = advanceTurn(record.state, record.state.turn.endsAt);
        record.turns = record.state.turn.number;
        record.state = result.state;
        record.events = result.events;
        changed = true;
        if (record.state.status === 'TERMINAL') record.endedAt = due;
      }
    }
  }
  return changed;
}
