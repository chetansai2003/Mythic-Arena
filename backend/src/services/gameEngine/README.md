# Deterministic engine — rules version 1

This JavaScript package has no database, network, clock or browser dependencies. Time and seed are explicit inputs. Its registry implements unit GUARD/SHIELD and the DAMAGE, HEAL and SHIELD spells.

```js
const state = createMatch({ gameId, players, seed, now });
// players: [{ id, displayName, cards: [{ instanceId, definition }] }, ...]
const validation = validateAction(state, authenticatedActorId, command);
const result = applyAction(state, authenticatedActorId, command, now);
const view = projectForPlayer(result.state, authenticatedActorId, now);
```

Creation validates 30-card decks, copy limits, globally unique instances and consistent frozen definitions. It detaches input objects, deterministically shuffles and chooses the starting player, deals opening hands, and begins turn 1. Readiness reservations are a future online orchestration concern.

`applyAction` returns `{ ok, state, events, error? }`. Commands use the shared strict envelope and require the current version. Inputs are never mutated. Rejections return the original state and no events unless an independent due deadline first advances the game. At or after a deadline, the caller must commit the returned timer state even when the command is rejected as stale. Every accepted action or expired turn increments the version once and emits a public event with a stable per-game ID.

`advanceTime(state, now)` catches up scheduled turn deadlines in order, with bounded work because the game ends by turn 100. `advanceTurn(state, now)` is a trusted internal turn transition, not a client command. `resolveDeaths` returns a detached state after removing all dead units; `determineOutcome` computes hero defeat without side effects.

`legalActions` enumerates legal moves; `chooseBotAction` selects deterministically using only its own hand and public character data. It never surrenders automatically. `projectForPlayer` constructs an explicit allowlist and parses the shared snapshot schema; the result contains no opponent hand identities, either deck order, discard contents or seed.

Callers own state persistence and serialization between actions. Redis compare-and-set, action-ID deduplication, authenticated sockets, readiness/disconnect scheduling and result outboxes belong to Step 4. Local practice has a separate adapter; it is not a secure online authority and its PENDING terminal snapshots never create account results.
