# Mythic Arena

A JavaScript 1v1 card game. Parts 1-5 provide accounts, deck building, practice, reliable online matches, saved results, and optional cinematic visuals.

## Run locally

Prerequisites: Node **22.17.0**, npm **10.9.2**, and Docker Desktop with the Linux engine running. From this folder:

```sh
npm ci
npm run setup
docker compose -f docker-compose.yml up -d --build --wait
```

Open **http://localhost:5173/lobby**. For online play, use two separate browser profiles with different accounts: save a deck in each, choose Find an opponent, then both choose Ready to battle within ten seconds. Create an account using a password of at least 12 characters, open My decks, name a deck, use the starter list or select 30 cards, and save. No accounts or passwords are seeded. All 20 original cards are available to every account. Open **http://localhost:5173/practice** for a guest starter match, or select a saved deck in the lobby and choose Practice with deck. Practice runs in one browser tab against a legal-action bot and never awards account wins.

`npm run setup` creates a local `.env` and a random authentication secret without printing it. It preserves existing configuration and replaces only an absent or placeholder secret. Never commit `.env`. Compose initializes a MongoDB replica set and runs the idempotent catalog/index setup as a separate one-shot service before starting the API.

| Service                    | Local address                      |
| -------------------------- | ---------------------------------- |
| Frontend                   | http://localhost:5173              |
| API                        | http://127.0.0.1:3001              |
| Worker health              | http://127.0.0.1:3002/health/ready |
| MongoDB replica-set member | 127.0.0.1:27018                    |
| Redis                      | 127.0.0.1:6379                     |

MongoDB uses host port 27018 to avoid an existing service on 27017. All published development ports bind to loopback. This profile has no production database credentials and is intended for local development.

```sh
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs api worker db-setup
docker compose -f docker-compose.yml down
```

Ordinary shutdown preserves data volumes. Adding `--volumes` erases this project's local databases; do so only for an intentional reset.

## Develop with host Node

```sh
npm ci
npm run setup
npm run dev:deps
npm run db:setup
```

Then use separate terminals so each service has its own logs:

```sh
npm run dev:frontend
```

```sh
npm run dev:backend
```

```sh
npm run dev:worker
```

`dev:backend` is an alias for `dev:api`; use whichever name is easier to remember. The frontend runs on port 5173, the API on 3001, and the worker health server on 3002. If one of those commands says the port is unavailable, that service is already running in another terminal or process. Use the existing process, or stop it before starting a new one.

The old combined command still exists:

```sh
npm run dev
```

Use it only when you want one terminal to own frontend, API, and worker together. If the full Compose application already runs, free its app ports first with `docker compose -f docker-compose.yml stop web api worker`. Keep the dependency containers running.

The host MongoDB URI uses `directConnection=true` because the single replica-set member advertises its Docker hostname (`mongo:27017`). Host processes connect to 127.0.0.1:27018; container processes use the Docker hostname. Do not reuse this single-node development topology as a production design.

## Verify

```sh
npm run check
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

- `check`: lint, formatting, unit/component tests, production frontend build, and server/package validation.
- `test:integration`: real Redis operations, MongoDB transactions, session expiry/rotation/reuse/logout, CSRF, throttles, deck ownership, invalid decks, revision conflicts, and frozen snapshot preparation.
- `test:e2e`: shell checks at three viewport sizes plus real registration/login/deck journeys. It launches an isolated API on port 3101 and a production preview on 4173. Redis and MongoDB must be running. Each run owns a unique temporary database and Redis prefix, cleaned after the run. Other application data is untouched.

On Linux CI use `npx playwright install --with-deps chromium`. Browser traces and screenshots appear under `test-results/`, and the HTML report under `playwright-report/`. Ports 3101 and 4173 must be free; the suite deliberately refuses to reuse an unrelated running server. The two-account journey runs on desktop once, while editor and shell checks run at desktop, laptop, and phone sizes.

With the complete Compose stack running:

```sh
node scripts/smoke-stack.js
node scripts/recovery-stack.js
```

The recovery script temporarily stops only this project's Redis container, checks readiness failure with working liveness, restarts Redis, and checks automatic recovery. Run it only against the development stack.

## Application boundaries

```text
frontend/                         React application, accounts and deck editor
backend/                          Express API, identity and deck persistence
backend/src/workers/              Separate worker process
backend/src/services/gameEngine/  Deterministic engine and practice bot
packages/shared/                  Runtime contracts and server utilities
infra/                            App image and replica-set initialization
docker-compose.yml                Full local development stack
scripts/                          Setup, validation and recovery tools
```

Application code is JavaScript/JSX with ES modules. There is no TypeScript compilation or fake `typecheck` command. Browser imports cannot use the shared server entry point; the engine boundary cannot import database or network code.

Access tokens stay in memory. Refresh tokens are random, hashed in MongoDB, rotated transactionally, and carried in httpOnly cookies. Mutations require CSRF and explicit origins. Production requires secure host-only cookies and HTTPS origins. Deck writes use authenticated ownership and expected revisions. Incomplete drafts stay in the current tab until they can be saved as valid 30-card decks.

## Troubleshooting

- Start Docker's Linux engine and confirm `docker info` before running integration/browser checks.
- For port conflicts, identify the existing listener instead of stopping unrelated applications. Update Compose host ports, host `.env`, and test overrides consistently. Test overrides are `TEST_REDIS_URL` and `TEST_MONGODB_URI`.
- If readiness is 503, inspect dependency health and `db-setup` logs. Run `npm run db:setup` for a host-development database. Never fall back to independent local match state during Redis failure.
- Invalid configuration reports field names without printing values. Fix `.env` and restart.
- Refresh-token reuse ends the session; sign in again. Use independent private windows or browser profiles to test different accounts simultaneously.
- Failed deck saves preserve the draft. A revision conflict offers reload or save-a-copy. Browser storage failures still permit in-memory editing, but cannot promise draft recovery after closing the tab.
- The GitHub workflow is configured, but a remote CI pass exists only after publishing a repository and actually running it. No remote repository or production deployment is created by this implementation.

See [folder architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [rules](docs/RULES.md), [decisions](docs/DECISIONS.md), [shared contracts](docs/contracts.md), [account/deck API](docs/part-2-api.md), [Part 1 evidence](docs/part-1-report.md), [Part 2 evidence](docs/part-2-report.md), [Step 3 evidence](docs/part-3-report.md), [Step 4 report](docs/part-4-report.md), and [Step 5 report](docs/part-5-report.md).

## Release and Step 6

Step 6 delivers release verification, security and confidentiality auditing, load testing, production staging deployment configurations, and operational runbooks:

```sh
npm run audit:security      # Security, privacy, anti-cheat isolation & bundle secret audit
npm run preflight:release   # Production configuration, Nginx, and Compose preflight check
npm run loadtest            # 100 simultaneous players across 50 concurrent matches benchmark
npm run demo                # Automated 5-minute showcase demo (matchmaking, moves, reconnect, history)
npm run ops:telemetry       # Live operational metrics (queue, active games, timer lag, outbox backlog)
npm run ops:drain           # Graceful match draining for zero-downtime rolling maintenance
```

See the [Step 6 release report](docs/part-6-report.md), [Step 6 plan](docs/part-6-plan.md), [operations runbook](docs/RUNBOOK.md), and [production deployment guide](docs/DEPLOYMENT.md).
