# API and events

The implemented HTTP API is documented in [Part 2 REST and security contract](part-2-api.md): account creation, login, refresh, logout, current profile, card catalog, and owned deck CRUD.

The browser uses the `/api` proxy prefix. Direct API requests use paths such as `/auth/login` and `/decks`.

Step 4 implements the multiplayer handlers described below. Runtime schemas in `packages/shared/src/index.js` remain the payload authority.

## Online connection

Socket.IO connects at `/socket.io` using WebSocket transport. The handshake requires an allowed browser Origin and `{ accessToken, clientId, takeover? }`. `clientId` is a UUID identifying the tab; it is not a credential. Tokens remain in memory. Session expiry/revocation disconnects the socket. Another tab must explicitly request takeover; Redis fences the previous controller.

Every client event requires an acknowledgement callback. Payloads reject extra fields. Successful acknowledgements are `{ ok: true }`; accepted commands additionally return `actionId`, committed `version`, and `eventId`. Rejections return `{ ok: false, error: { code, message, latestVersion? } }`. Retry an uncertain command with its original action ID and identical payload.

| Client event    | Payload                                                | Behavior                                                                       |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `queue:join`    | `{ deckId, mode: 'CASUAL' }`                           | Validates ownership and freezes the deck before atomic queue reservation       |
| `queue:leave`   | `{}`                                                   | Cancels queue membership; an already committed reservation still wins the race |
| `match:ready`   | `{ gameId }`                                           | Both players must confirm within ten seconds                                   |
| `game:command`  | `{ gameId, actionId, expectedVersion, type, payload }` | Applies a validated engine move with atomic deduplication                      |
| `state:request` | `{ gameId, knownVersion? }`                            | Checks participation and emits a full private snapshot                         |

The server emits `queue:state`, `match:found`, `game:state`, `game:event`, `game:ended`, and `game:error`. A snapshot contains your hand and public opponent information, never the opponent's hand, either deck order, discard contents, or shuffle seed. Snapshots are emitted only after commit. Clients drop older versions and restore across gaps; restored snapshots do not replay animation events.

## Results

`GET /matches` requires authentication and returns `{ matches }`, the latest 50 completed matches for that user. Each receipt includes participants, outcome, timestamps, mode, rules version, and turn count. `GET /leaderboard` is public and returns `{ players }`, up to 50 users with at least one win, ordered by wins, display name, and ID. Private account fields are omitted.

The terminal board reports `PENDING` until MongoDB commits the receipt and win increment transactionally. The worker retries without duplicate credit. Draws, readiness failures, both-offline aborts and state-loss aborts award no wins.
