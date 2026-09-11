# Part 1 verification report

Implementation complete; local verification gate passed on September 11, 2026. A hosted GitHub Actions run remains unobserved because this workspace has no configured Git repository or remote. The workflow is provided, and its local checks were executed; this is not a claim of a remote CI pass.

## Delivered

- JavaScript npm workspace with web, API, worker, shared contracts, and a reserved pure-engine boundary.
- RULES.md version 1; documented clarification of energy, Guard, Shield, deadlines, and turn 100.
- Strict Zod schemas for cards, decks, commands, events, private snapshots, errors, and lifecycle state.
- React/Vite/Tailwind shell with Redux preferences, all required routes and fallback states, accessible controls/dialogs, original static arena scenery, and desktop/mobile layouts.
- Compose Redis, MongoDB replica set, API, worker, and web; explicit environment validation, request IDs, safe errors, dependency-aware health, and graceful-shutdown code.
- Setup instructions, contracts, asset inventory, CI workflow, integration tests, and browser evidence.

## Observed commands and results

| Command/check | Result |
| --- | --- |
| `npm run check` | Passed lint, formatting, 42 unit/component tests across six files, production build, and server module validation |
| `npm run test:integration` | 3 passed: Redis round trip, MongoDB transaction commit/rollback, bounded connection loss/recovery |
| `npm run test:e2e` | 21 passed across Chromium 1440x900, 1280x720, and 390x844; final run 1.9 minutes |
| Automated accessibility | No reported WCAG 2 A/AA and 2.1 AA violations on lobby, decks, settings, and login at all three viewports; manual usability inspection complements this limited automated check |
| Docker image `npm ci` and build | Clean Linux dependency installation and production build succeeded |
| `docker compose -f infra/compose.yml up -d --wait` | Redis, MongoDB, API, worker, and frontend healthy; initializer exited successfully |
| `node scripts/smoke-stack.js` | API/worker readiness, frontend proxy, and direct routes passed |
| `node scripts/recovery-stack.js` | Stopped project Redis: API/worker readiness 503 and liveness 200; both recovered readiness after restart |

Runtime: Windows host Node 22.17.0/npm 10.9.2, Docker Desktop Linux engine 29.5.3; Linux app image Node 22.17.0. Exact library versions are in package-lock.json. Build at this milestone: approximately 368 kB JavaScript / 117 kB gzip and 23.5 kB CSS / 6.5 kB gzip.

## Visual and failure evidence

Inspected actual desktop and phone lobby screenshots; the laptop and all three settings layouts were also exercised by browser checks. No horizontal document overflow on any required route/viewport. Keyboard checks cover skip navigation, visible focus, dialog containment, Escape dismissal, and focus restoration. User and system reduced-motion settings were verified; device preferences survive reload.

Found and fixed during verification: invalid URL exceptions escaping configuration sanitization; a native dialog Tab cycle reaching outside its controls; the frontend container's unwritable Vite cache directory; and missing spaces in mobile card text. MongoDB moved to loopback port 27018 to avoid an existing unrelated database. Interrupted image downloads were retried successfully.

Screenshots and traces are produced under test-results/ and the HTML report under playwright-report/. Representative screenshots are retained in docs/evidence/. Initial failures are recorded here rather than represented as successful runs.

## Scope and remaining work

No accounts, saved decks, gameplay, matchmaking, or 3D were represented as operational at this milestone. Those belong to Parts 2 onward. Automated accessibility is not a complete accessibility certification. The current local Compose profile is not a production deployment. Original source PDFs/DOCX were preserved. No Git commit or hosted CI run was fabricated.

The user subsequently authorized Part 2; its changes and evidence are recorded separately.
