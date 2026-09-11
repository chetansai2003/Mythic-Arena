# Part 2 delivery report

Implemented in JavaScript/JSX on September 11, 2026. The project now follows the requested `frontend/` and `backend/` organization, with root `docker-compose.yml` and architecture, rules, API/event, and deployment documentation under `docs/`.

## Delivered behavior

- Registration, login, session restoration, current profile and logout. Passwords use Argon2id. Access tokens remain in memory; opaque refresh tokens are hashed in MongoDB, rotated transactionally and revoked on reuse. Logout revokes both the displayed bearer session and the cookie session when they differ. CSRF, allowed origins and Redis throttling protect account mutations.
- Explicit, repeatable setup creates indexes and seeds 20 original immutable cards across five factions. No user credentials are seeded. Catalog metadata distinguishes valid deck construction from future battle availability.
- Owned persistent deck creation, listing, renaming, duplication, updating and deletion. Server validation requires exactly 30 known cards and at most two copies per definition. Expected revisions detect conflicting edits. Cross-account access is rejected. Snapshot preparation copies definitions and generates per-instance IDs for later match creation.
- Responsive deck editor with search, faction/type filtering, card details, copy counts, starter list, save status, preserved drafts after failures, navigation protection, revision recovery and confirmed deletion. The lobby lists the signed-in user's real decks.
- Separate page folders, reusable UI, frontend services/store/hooks, and backend controllers/routes/middleware/models/services. Worker and engine package boundaries remain isolated inside the backend. Shared runtime schemas remain in `packages/shared`.

## Verification

The final reorganization was checked with:

| Check                             | Result                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| ESLint and Prettier               | Passed                                                                  |
| Unit and component tests          | 47 passed across 8 files                                                |
| Real MongoDB/Redis integration    | 19 passed across 2 files                                                |
| Production frontend build         | Passed; JavaScript 484.41 kB, 150.83 kB gzip                            |
| Server syntax and package imports | Passed                                                                  |
| Browser suite                     | 25 passed; 2 intentionally skipped duplicate scenarios                  |
| Automated accessibility           | No violations in the tested shell pages and deck editor                 |
| Clean Linux image                 | `npm ci` and production build passed                                    |
| Root Compose startup              | API, worker, frontend, MongoDB and Redis running                        |
| Stack smoke check                 | Health, frontend API proxy and deep links passed                        |
| Redis outage and recovery         | Readiness 503 and liveness 200 during outage; automatic recovery passed |

Integration coverage includes duplicate identity, invalid credentials, expiry, sequential and concurrent refresh reuse, logout revocation, CSRF, throttling, deck ownership, invalid compositions, stale revisions and snapshot independence.

Retained screenshots: [desktop deck editor](evidence/part-2-desktop.png) and [phone deck editor](evidence/part-2-phone.png). Browser fixture cleanup completed successfully. A scan confirmed there are no application TypeScript files and the local authentication secret does not appear in the built frontend bundle.

Browser checks use isolated temporary databases and Redis prefixes. They exercise two independent accounts, persistence through reload/login, incorrect-password errors, secure cookie properties, absence of tokens in browser storage, editor filters/inspection, failed-save recovery, navigation confirmation, duplication and deletion. Shell and editor checks cover 1440×900, 1280×720 and 390×844 viewports, keyboard interaction, overflow and automated accessibility checks. The two-account scenario runs once on desktop; its laptop/phone copies are intentionally skipped and are not counted as passes.

## Operational notes

The root Compose file builds one application image and shares it across the API, worker, frontend and one-shot database setup. MongoDB uses host port 27018. Only API/setup containers receive the root environment file. Readiness probes remain bounded independently of longer database operations such as index creation.

Browser cleanup runs in a native Node subprocess to avoid Playwright's module-loader conflict with the MongoDB driver. Cleanup validates each run's unique namespace before deleting its fixtures. Application data and unrelated Docker services are preserved.

The CI workflow is configured, but no remote CI run or production deployment is claimed. This workspace has no configured Git repository. Interactive 3D, the battle engine, Socket.IO matchmaking, timers, match history data and leaderboard calculations remain future milestones.

Start and use the app with the instructions in [README](../README.md). The detailed [API contract](part-2-api.md) and [folder architecture](ARCHITECTURE.md) describe the implementation.
