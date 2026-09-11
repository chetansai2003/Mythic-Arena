# Mythic Arena

A JavaScript foundation for an original, turn-based 1v1 card game. Part 1 provides the application shell, shared runtime contracts, local infrastructure, and verification tooling. Accounts, saved decks, the engine, matchmaking, and 3D are later milestones. Preview screens do not imply working online play.

## Start the complete local application

Prerequisites: Docker Desktop with its Linux engine running and Docker Compose v2. The image builds the app, so a host Node installation is not required for this path.

```sh
docker compose -f infra/compose.yml up -d --build --wait
```

Open **http://localhost:5173/lobby**. The API is at http://127.0.0.1:3001 and worker health at http://127.0.0.1:3002. Development Redis uses port 6379; the project MongoDB uses **27018** to avoid the usual host MongoDB port. MongoDB inside Compose still uses port 27017.

```sh
docker compose -f infra/compose.yml ps
docker compose -f infra/compose.yml logs api worker
docker compose -f infra/compose.yml down
```

Ordinary `down` preserves the project database volumes. Do not add `--volumes` unless you intend to erase this project's development data. These loopback-only services have no production credentials; they are for local development.

## Develop with host Node

Use Node **22.17.0** and npm **10.9.2** (also recorded in .nvmrc and package.json). These commands work from a folder with spaces on Windows and from Linux. Install dependencies before running scripts:

```sh
npm ci
docker compose -f infra/compose.yml up -d --wait redis mongo mongo-init
```

Copy `.env.example` to `.env`. In PowerShell: `Copy-Item .env.example .env`; on Linux/macOS: `cp .env.example .env`. Then:

```sh
npm run dev
```

If the full Compose app is already running, stop its app containers first to free the ports: `docker compose -f infra/compose.yml stop web api worker`. Keep the dependency containers running. `npm run dev:web` starts just the frontend and remains useful while services are unavailable; the lobby reports the actual connection state.

The host MongoDB URI uses `directConnection=true` because the replica-set member is advertised as `mongo:27017`, a hostname reachable within Compose only. The host connects directly to the single member on 127.0.0.1:27018. Do not carry this single-node development topology into production.

## Verify

```sh
npm run check
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

`check` runs lint, formatting, unit/component tests, and build. Integration tests require the Redis and initialized replica-set services. They use a unique test database and Redis prefix and clean only their own data. Browser tests use the production build from `check`, start a Vite preview on port 4173, and cover three viewports. On Linux CI install browser system dependencies with `npx playwright install --with-deps chromium`.

With the full Compose stack running, `node scripts/smoke-stack.js` verifies API/worker readiness, the frontend API proxy, and direct routes. `node scripts/recovery-stack.js` temporarily stops only this project's Redis container, verifies degraded readiness with working liveness, then starts it and verifies recovery. That recovery script must only be run against the development stack.

| Script                            | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `npm run lint`                    | JavaScript, hooks, and import boundaries         |
| `npm run format` / `format:check` | Format or verify source and docs                 |
| `npm test`                        | Unit and component tests                         |
| `npm run test:integration`        | Real Redis operations and MongoDB transactions   |
| `npm run test:e2e`                | Chromium desktop/laptop/phone journeys           |
| `npm run build`                   | Production frontend and server module validation |

There is no TypeScript compilation or placeholder `typecheck`. JavaScript validation is intentional. Application imports do not start listeners; only the API/worker executable entry points do.

## Structure

```text
apps/web/              React, Vite, Tailwind, Redux Toolkit, route shell
apps/api/              Express health, errors, origins, request IDs
apps/worker/           Independent dependency-aware process; no jobs yet
packages/shared/      Strict Zod contracts and isolated server utilities
packages/game-engine/ Pure-engine boundary reserved for Part 3
infra/                Compose, Dockerfile, MongoDB replica-set initializer
tests/                Browser/integration suites and component setup
docs/                 Decisions, contracts, plans, and observed evidence
```

The browser may import `@mythic/shared` but never `@mythic/shared/server`. Commands do not accept actor identity. Player-safe snapshots explicitly exclude opponent hand contents, seeds, and deck order. Later engine/network tests must verify actual projection and delivery as well.

## Troubleshooting and handoff

- **Docker unavailable:** Start its Linux engine; confirm `docker info`. Browser-only development still works, but the infrastructure gate is not passed without service tests.
- **Port conflict:** Identify the existing listener; do not terminate an unrelated service. Update the relevant Compose host port, host `.env`, and test override together. Integration overrides: `TEST_REDIS_URL`, `TEST_MONGODB_URI`.
- **Replica set not ready:** Check `docker compose -f infra/compose.yml logs mongo-init mongo`. Startup waits for a writable primary; rerunning initialization is safe.
- **Readiness 503:** Inspect dependency status. Liveness remains 200 during a dependency outage. The API never creates an independent in-memory substitute.
- **Invalid environment:** Only field names are reported; values are not logged. Fix `.env` and restart.
- **Browser installation fails:** Retry the exact Playwright install command. A skipped browser suite is not a pass.

See [rules](RULES.md), [decisions](docs/DECISIONS.md), [contracts](docs/contracts.md), and [Part 1 evidence](docs/part-1-report.md). The CI workflow is ready for GitHub but is only observed as a remote CI run after the project is placed in a Git repository and pushed. No production resources are provisioned.
