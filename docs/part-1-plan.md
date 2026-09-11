# Part 1 implementation plan: JavaScript foundation

Status: planned; no application implementation or verification has been completed.

## Objective and authority

Deliver a reproducible JavaScript workspace, explicit gameplay rules, shared runtime contracts, healthy local services, and an accessible application shell. A new developer must be able to follow the README and reach the lobby shell.

The user's JavaScript requirement overrides TypeScript references in the supplied documents. The Six Part Implementation Plan takes precedence over the earlier Architecture and UI/UX blueprints where they conflict. Preserve all three original documents.

Part 1 ends at its verification gate. Authentication, persistent decks, the playable engine, matchmaking, result processing, and cinematic 3D belong to later parts. Planned features must not appear operational.

## 1. Freeze rules and decisions

Create RULES.md and docs/DECISIONS.md before feature code. Give rules stable identifiers so later tests can reference them.

- Casual 1v1 release; practice bot and wins leaderboard are later deliverables. Ranked seasons are deferred.
- Thirty-card decks, at most two copies per definition, at least 18 original catalog definitions eventually available to both players.
- Twenty starting health, five opening cards, server-selected first player and seeded shuffle.
- Each personal turn increases maximum energy by one, capped at ten; refill, draw, and reset attack availability. First player skips their opening draw.
- Thirty-second server turn deadline; five unit slots per side; ten-card hand limit.
- Units cannot attack on the turn they enter play and attack once per personal turn. Enemy Guard restricts unit attack targets. Unit combat damage is simultaneous; hero targets do not retaliate.
- Spells use a finite effect registry. Shield absorbs the next damage instance. Healing cannot exceed initial maximum health. Extra drawn cards are discarded; empty-deck draws cause escalating fatigue beginning at one.
- Zero hero health ends the game; simultaneous lethal resolution is a draw. Surrender is immediate. Define the turn-100 cutoff precisely.
- Thirty-second reconnect grace does not pause turns. One expired offline player forfeits; both offline at disconnect resolution means abort without leaderboard credit. Resolve equal disconnect/turn deadlines in disconnect-first order.
- Readiness lasts at most ten seconds; begin gameplay when both clients are ready, otherwise abort without penalty. Intro animations cannot consume the first turn.

Record these proposed clarifications as explicit decisions, not as quotations from the source documents:

- Energy begins at zero before turn setup; the starting player enters turn one with one energy.
- Count a turn as one player's turn; permit turn 100 to finish, resolve its outcome, then draw if still active before turn 101 begins.
- Guard restricts unit attacks, while spell targets come from each effect's declared target policy.
- Shield is non-stacking; zero damage does not consume it. Define eligible recipients in card effects.
- Resolve a complete simultaneous damage batch before checking hero defeat; a terminal match cannot accept additional actions.
- For an input arriving at or after a deadline, resolve the due system transition before considering that input.
- Choose concrete effect keys and target policies for damage, healing, Guard, and Shield. The full named and balanced card catalog remains Part 2.

Gate: the rules have no unresolved question that blocks schemas; any remaining content or balance decisions are explicitly deferred.

## 2. Establish the JavaScript monorepo

Use npm workspaces and ES modules. Application source uses .js/.jsx; tool configuration uses JavaScript where supported. Use JSDoc only where it clarifies public interfaces. Do not add a TypeScript compiler or a fake passing typecheck command: replace the original TypeScript gate with linting, boundary validation, module/build verification, and focused tests. Explain this adaptation in DECISIONS.md.

```text
apps/
  web/                 React, Vite, routing, Redux Toolkit, Tailwind
  api/                 Express bootstrap, health, errors, logging
  worker/              Independent process bootstrap and service lifecycle
packages/
  shared/              Zod schemas, constants, event names, fixtures
  game-engine/         Package boundary and public API design only
infra/                 Compose, replica-set initialization, containers
tests/e2e/             Playwright tests, separate from unit discovery
docs/                  Decisions, contracts, setup and evidence
```

Choose a supported Node LTS compatible with Vite; pin the exact validated Node and npm versions during execution, along with package-lock.json and explicit dependency versions. Keep browser-safe shared exports separate from server configuration and secrets. Shared has no dependency on the apps; the future engine depends only on shared and pure JavaScript facilities. Web must not import API/worker code.

Add .gitignore, .editorconfig, ESLint, formatting configuration, and cross-platform npm scripts. Scripts must work from this Windows workspace, including its spaces, and in Linux CI. Avoid Unix-only shell assignments in npm commands. Establish repository status before Git operations; do not assume this folder is already a Git checkout.

Gate: clean install resolves all workspaces; lint and package imports run successfully; web builds; API and worker entry points can be validated without side effects merely from importing their application modules.

## 3. Bootstrap local services and process lifecycle

- Make Docker Compose the canonical full-stack setup for web, API, worker, Redis, and a single-node MongoDB replica set. Offer an optional host-Node workflow with documented replica-set address discovery and a tested connection string.
- Initialize the replica set idempotently. Wait for a writable primary, rather than treating an open MongoDB port as readiness. Verify transactions actually work.
- Pin container images, use named development volumes, and expose development ports on loopback where practical. Ordinary shutdown preserves data; document any destructive reset separately.
- Validate configuration with Zod before listening. Examples contain safe development values or documented placeholders, never actual credentials. Require only configuration used in Part 1.
- Provide API /health/live and /health/ready. Liveness reports whether the process can respond; readiness checks Redis and MongoDB with bounded timeouts and returns 503 when dependencies fail. Expose no connection strings or internal exception details.
- Give the worker a real dependency-aware health mechanism usable by Compose. It starts and shuts down cleanly but does not pretend to process jobs yet.
- Add structured request IDs, bounded/validated incoming correlation IDs, centralized safe errors, explicit frontend origins, and log redaction for credentials and tokens.
- Handle termination by failing readiness, stopping new work, closing listeners and dependency clients, and applying a bounded shutdown timeout.

Gate: fresh Compose setup becomes healthy; Redis round trip and MongoDB transaction succeed; malformed environment fails safely; dependency loss produces readiness failure and recovery; processes stop without hanging.

## 4. Define shared runtime contracts

Create reusable strict Zod schemas and publish their shapes in docs/contracts.md:

- Rules version, card definition/version, faction, unit/spell variants, effect keys, target policies, and card instance IDs.
- Draft deck versus playable deck: drafts may be incomplete; playable decks must satisfy count and copy limits. Catalog existence and ownership require server checks in Part 2, not merely schema validation.
- Command envelope: gameId, actionId, expectedVersion, type, payload. Use discriminated payload schemas for PLAY_CARD, ATTACK, END_TURN, and SURRENDER.
- Queue join/leave, match readiness, state request, structured acknowledgement, error codes, accepted event IDs, and match lifecycle/result states.
- Player-safe snapshots containing own hand, public boards and health/energy, opponent hand count, deck counts, turn owner/deadline, and version. Explicitly exclude opponent card identities, deck order, random seed, and internal operational state.

Use the newer plan's client event names: queue:join, queue:leave, match:ready, game:command, and state:request. Specify a single consistent server-event vocabulary in the contract document. Reject incoming identity fields; authenticated identity is supplied by server context later. Keep worker/system actions distinct from client commands.

Document future semantics now: duplicate retries return the recorded outcome; reusing an action ID with another payload is invalid; stale versions resync; acknowledgement timeout means unknown outcome. Do not implement Redis action commits in this part.

Gate: valid examples parse; malformed or unknown fields, invalid variants, and negative counters fail. Snapshot tests reject extra private fields. Document that this validates the boundary shape; real engine projection and network privacy tests follow in Parts 3 and 4.

## 5. Build the accessible application shell

Create routes for /, /login, /register, /lobby, /decks, /match/:gameId, /history, /leaderboard, /settings, and unknown paths. Deep links and refresh must work in development and the documented production-preview setup.

- Establish reusable navy surface, gold action, cyan focus, violet accent, typography, spacing, and 12-18 px radius tokens. Use text and icons alongside status color.
- Build Button, Dialog, Toast, StatusBanner, Skeleton, form controls, navigation, and route error boundaries.
- Build meaningful screen shells: lobby deck/queue placeholders, deck empty state, match unavailable state, history/leaderboard empty states, and account form previews with submission unavailable. No fabricated wins, players, successful logins, or live queues.
- Implement actual navigation and local settings such as reduced motion and graphics preference. Default audio muted. No canvas or 3D dependency is needed yet.
- Use Redux Toolkit for shared client preferences/UI state and component state for local interactions. Avoid a second global store or persistently stored auth tokens.
- Support loading, empty, recoverable error, and not-found states through reusable components and deterministic test fixtures. Test-only fixtures must not masquerade as live data.
- Support visible focus, skip navigation, semantic labels, keyboard activation, Escape dismissal, dialog focus containment/restoration, and suitable live regions. Respect system reduced motion and a user option to reduce further.
- Inspect 1440x900, 1280x720, and 390x844 layouts. No clipped controls, horizontal page overflow, or overlapping health/energy/hand placeholders. Keep future battle rows distinct.

Gate: a user can navigate the shell and settings by keyboard; direct routes and unknown routes work; dialogs return focus; reduced motion stops ambient effects; all three viewport sizes remain usable.

## 6. Add verification, CI, and handoff

Introduce each relevant test with its implementation, then run the combined gate. Use Vitest for unit/component tests, React Testing Library for interaction tests, API request tests for health/errors, real Redis/MongoDB integration tests, and Playwright for browser journeys.

| Command                  | Required purpose                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------ |
| npm ci                   | Reproducible workspace installation                                                  |
| npm run dev              | Documented host development entry point                                              |
| npm run lint             | JavaScript, React, and import correctness checks                                     |
| npm run format:check     | Formatting verification                                                              |
| npm test                 | Unit/component suite only                                                            |
| npm run test:integration | Service readiness, Redis, replica-set transaction, and failure recovery              |
| npm run test:e2e         | Navigation, deep links, keyboard/dialogs, reduced motion, and responsive smoke tests |
| npm run build            | Web production build plus declared server/package validation                         |
| npm run check            | Lint, format check, unit tests, and build                                            |

CI must run static checks, unit tests, build, integration checks with isolated services, and browser smoke tests. Install required browser dependencies; save Playwright traces/screenshots on failure. Use unique test database names and Redis key prefixes; clean only test-owned data. Do not add placeholder tests for unimplemented game behavior.

Deliver README.md, RULES.md, docs/DECISIONS.md, docs/contracts.md, .env.example files, and docs/part-1-report.md. The report records requirements covered, modified files, exact commands and observed results, runtime/package versions, browser/viewport evidence, at least one dependency-failure recovery, and remaining gaps.

Part 1 is complete only when a clean setup reaches the lobby, all required checks pass, service failure/recovery is demonstrated, and the shell has been visually inspected. An unavailable Docker runtime, browser, package download, or CI run is recorded as unverified, never passed. Do not automatically advance to Part 2.

## Execution sequence

Rules and decisions -> workspace/tooling -> service bootstrap -> shared schemas -> shell/components -> combined verification and handoff. Define the initial schema outline with the rules, then implement it in the shared workspace. Add tests and setup documentation throughout.

No fixed time estimate or claim of perfection replaces the completion evidence. Resolve findings inside this scope and report any remaining limitation explicitly.

## Official references checked for tooling

- Node release support: https://nodejs.org/en/about/previous-releases
- Vite setup and runtime requirements: https://vite.dev/guide/
- Playwright CI setup and browser dependencies: https://playwright.dev/docs/ci

Recheck exact compatible versions at implementation time before locking dependencies.
