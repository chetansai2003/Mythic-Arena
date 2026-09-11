# Shared contracts — version 1

Source of truth: `packages/shared/src/index.js`. All wire objects use strict Zod schemas. Fields not explicitly declared are rejected rather than silently copied into responses. Network handlers are implemented in later parts.

## Data

- Definition IDs and instance IDs are distinct. IDs contain 1-80 letters, digits, underscores, or hyphens. Action IDs are UUIDs. Time values are integer epoch milliseconds.
- Definitions freeze `version` and `rulesVersion`. Unit and spell variants have different required fields. Supported spell effect keys are DAMAGE, HEAL, SHIELD with the target policies in RULES.md. GUARD/SHIELD are unit keywords. Art references are local asset paths or null.
- Draft decks permit 0-30 cards. Playable decks require 30 cards and at most two of each definition. Schema validation does not establish catalog existence, ownership, or effect implementation; the API checks those in Part 2.
- A snapshot contains `gameId`, `rulesVersion`, `version`, `status`, `serverNow`, `readyEndsAt`, `turn`, `self`, `opponent`, `outcome`, and `resultStatus`.
- `self.hand` holds instance IDs and frozen definitions. `opponent` has only `handCount`; both expose public health/energy, shield, board, connection state, and deck count. Boards contain public unit IDs/stats/keywords. No seed, internal log, action deduplication record, private deck IDs/order, or opponent hand IDs appear.
- Lifecycle: INITIALIZING has a readiness deadline and no turn/outcome; ACTIVE has a turn and no outcome; TERMINAL has an outcome and no active deadline/turn. Result state is NONE until terminal, then PENDING or PERSISTED.
- Outcomes: WIN with participant winner ID and DEFEAT/SURRENDER/DISCONNECT reason; DRAW with SIMULTANEOUS_DEFEAT/TURN_LIMIT; ABORT with NOT_READY/BOTH_OFFLINE/STATE_LOST.

## Client events

| Event           | Payload                      |
| --------------- | ---------------------------- |
| `queue:join`    | `{ deckId, mode: 'CASUAL' }` |
| `queue:leave`   | `{}`                         |
| `match:ready`   | `{ gameId }`                 |
| `game:command`  | Discriminated command below  |
| `state:request` | `{ gameId, knownVersion? }`  |

```json
{
  "gameId": "game_123",
  "actionId": "f50ca4f2-92c1-41f1-9d73-044c1ab96fca",
  "expectedVersion": 14,
  "type": "PLAY_CARD",
  "payload": { "cardInstanceId": "ci_7" }
}
```

PLAY_CARD accepts cardInstanceId and optional target. ATTACK requires attackerId and target. END_TURN and SURRENDER require an empty payload. Targets are `{ kind: 'HERO', playerId }` or `{ kind: 'UNIT', instanceId }`. A target player ID identifies the target, never the acting user. Actor identity comes from the authenticated socket/session.

System actions such as deadline expiration must never be accepted through this command schema. Their internal worker schema will be added with deadline scheduling in Part 4.

## Server events and acknowledgements

| Event         | Payload                                                       |
| ------------- | ------------------------------------------------------------- |
| `queue:state` | IDLE/QUEUED status and nullable queuedAt                      |
| `match:found` | gameId, opponent public profile, readyEndsAt                  |
| `game:state`  | Strict player-safe snapshot                                   |
| `game:event`  | eventId, gameId, version, nullable actionId, type, occurredAt |
| `game:ended`  | gameId, outcome, PENDING/PERSISTED resultStatus               |
| `game:error`  | Safe structured error                                         |

Accepted event types initially cover CARD_PLAYED, ATTACK_RESOLVED, TURN_STARTED, MATCH_ENDED. These envelopes deliberately carry no unrestricted payload. Later animations may extend them with explicit public fields, never raw engine state. Each accepted transition has a stable event ID so restore/retry does not replay visual effects.

Acknowledgements are `{ ok: true, actionId?, version?, eventId? }` or `{ ok: false, error }`. Errors have a stable code, safe message, optional requestId and latestVersion. Codes are exported in errorSchema.

Part 4 must atomically compare expectedVersion, check actionId, and commit the new state with its accepted-action record and terminal outbox when applicable. An identical retry returns the recorded result; a reused ID with a different payload is rejected. Stale versions request a fresh snapshot. Acknowledgement timeout means unknown outcome, so retry with the same actionId. Discard older snapshots and resync after gaps. Private snapshots are sent per recipient, not broadcast wholesale to a room.

## Part 1 REST and worker health

GET `/health/live`: 200 when the process can serve a request, independent of dependencies. GET `/health/ready`: 200 when Redis responds and MongoDB is a writable replica-set primary; 503 during dependency failure or shutdown. The worker uses the same paths on its separate port and its live response identifies jobs as not implemented.

The API generates a UUID request ID unless a safe 1-80 character caller ID is supplied. It returns it in `x-request-id`, rejects origins outside configuration, restricts JSON size, and never echoes rejected bodies or connection strings. The frontend `/api` prefix proxies to the API in both development and preview.

## Verification limits

Fixtures are deterministic examples, not a playable catalog or live data. Part 1 tests schema strictness and lifecycle shapes. Engine legality, hidden-information projection, authentication, concurrency, retransmission, and result delivery remain later gates.
