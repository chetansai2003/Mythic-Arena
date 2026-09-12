# Step 4 — online reliability

Implemented September 12, 2026 in JavaScript/JSX. This milestone connects the existing rules engine to authenticated online matches and durable results.

## Delivered

- Authenticated Socket.IO, strict origins and payloads, per-operation authorization, session expiry/revocation, throttling, participant-only snapshots, and explicit controller takeover.
- One atomic Redis casual queue, frozen owned decks, duplicate-user exclusion, cancellation races, interrupted-reservation repair, and ten-second readiness.
- Compare-and-set state transitions with action fingerprints and acknowledgements stored atomically alongside the terminal outbox. Concurrent commands cannot spend energy twice; retrying the same action returns its original receipt.
- Online lobby, readiness, battle board, reconnect restoration, version-gap recovery, unknown-acknowledgement retry, pending/saved results, match history, and leaderboard. Practice remains local and awards no wins.
- Independent worker for durable readiness, turn, disconnect and result processing. Missing scheduler entries are rebuilt from authoritative state. Disconnect deadlines precede equal-time turn deadlines.
- Transactional MongoDB result receipts and win increments. Interrupted result writes retry without duplicate credit. Durable active-match membership supports aborting unrecoverable Redis state loss without awarding wins.

## Verification

The integration suite includes isolated real Redis/MongoDB tests for concurrent joins, join/cancel races, readiness, duplicate commands, energy double-spend prevention, privacy, controller fencing, stale/missing timers, 29-second reconnect, 30-second forfeit, both-offline aborts, state loss, lost acknowledgements and storage failures.

Process fault tests launch only owned test processes. One kills the API after its Redis commit and before acknowledgement, verifies a separate worker advances the turn, then retries the original command. Another kills the result worker after MongoDB commits but before Redis marks persistence; the restarted worker completes with exactly one win.

Browser verification uses separate authenticated browser contexts with saved decks, real queue/readiness, a committed turn, reload/reconnect, surrender completion, saved-result display, history and leaderboard. This complements the pure-engine natural-match tests; it does not claim a natural online lethal match or production load testing.

| Check                                 | Observed result                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run check`                       | Passed: lint, formatting, 90 unit/component tests, production build and server module validation                  |
| `npm run test:integration`            | 38 passed, including 19 online reliability tests with real Redis/MongoDB and owned-process crash injection        |
| `npm run test:e2e`                    | 37 passed; 2 intentionally skipped duplicate account journeys; visual fixture check also passed                   |
| Online browser journey                | Passed at 1440×900, 1280×720 and 390×844 with no automated accessibility violations on the tested battle board    |
| `docker compose up -d --build --wait` | Clean Linux `npm ci` and build passed; API, worker, web, MongoDB and Redis healthy                                |
| `node scripts/smoke-stack.js`         | Full-stack readiness, API proxy and deep links passed                                                             |
| `node scripts/recovery-stack.js`      | Actual Redis stop: API/worker readiness 503 while liveness stayed 200; both recovered automatically after restart |

Screenshots: [desktop](evidence/part-4-desktop.png), [laptop](evidence/part-4-laptop.png), [phone](evidence/part-4-phone.png). Desktop and phone captures were visually inspected. Small-screen hand and board rows scroll horizontally, while the page itself fits the viewport.

Initial production JavaScript is 489.26 kB / 152.38 kB gzip. The authenticated socket client loads separately (45.28 kB / 14.36 kB gzip); the battle module is shared between lazy practice and online pages. Browser traces may show WebSocket reset messages during intentional navigation/reload; the complete journeys and restored states passed.

## Run and boundaries

Start the stack using the [README](../README.md). In two separate browser profiles, register different accounts, save a valid deck, choose **Find an opponent**, then both choose **Ready to battle** within ten seconds. The match route survives reload. Use **Take control in this tab** only when intentionally replacing another controller.

This implementation targets one API process, one Redis instance and idempotent workers. Browser connections require WebSocket support. There is no Redis Cluster or horizontal Socket.IO adapter claim. Production provisioning, interactive 3D and load testing remain later milestones.

Normal socket disconnect starts a 30-second reconnect deadline. API process loss is detected by a six-second presence lease, followed by the 30-second deadline. Heartbeats renew every two seconds; the worker polls every 500 ms. Deadlines are rechecked against stored state, so processing delay cannot change their ordering. Dependency outages fail closed; jobs retry when dependencies return.

Terminal records remain in Redis while results are pending. Persisted records expire after seven days; MongoDB history remains durable. The development replica set is a single node. Permanent loss of both Redis state and MongoDB membership cannot be recovered by this application. No remote CI run or production deployment is claimed.

See [API/events](API_EVENTS.md) and [implementation plan](part-4-plan.md).
