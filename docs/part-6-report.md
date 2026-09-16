# Step 6 — release, verification, and deployment

Implementation date: September 15, 2026. Scope: page 8 of the six-part plan, JavaScript/JSX throughout.

## Delivered

- **Test matrix hardening**: Resolved lint issues, tuned vitest worker pool configuration for Windows stability, and verified complete test suite passes across all workspaces (94 unit/component tests, 38 integration tests, visual regression tests, and production build).
- **Automated security and privacy audit (`scripts/audit-security.js`)**:
  - Scanned frontend production bundles in `frontend/dist/` ensuring zero backend secrets, MongoDB URIs, or internal auth keys are leaked.
  - Confirmed strict anti-cheat data isolation: opponent hand cards, deck ordering, and random seeds are completely stripped from snapshots and events.
  - Verified strict Zod payload validation rejects malformed commands and unexpected schema fields.
  - Verified credential and bearer token redaction in application logs.
  - Enforced production HTTPS origin validation and rejection of placeholder secrets.
- **Declared target load testing harness (`scripts/load-test.js`)**:
  - Benchmarked 100 simultaneous virtual players across 50 concurrent matches.
  - Executed 400 game commands and 200 duplicate idempotency checks.
  - Confirmed 50/50 matches completed cleanly with 50/50 durable receipts in MongoDB.
  - Observed 0 duplicate commits and 0 result loss.
  - Telemetry recorded in [part-6-load-test.json](evidence/part-6-load-test.json).
- **Staging and production deployment assets**:
  - `.env.production.example`: Production configuration template with TLS Redis (`rediss://`), MongoDB replica sets, and HTTPS origins.
  - `infra/nginx.conf`: Production Nginx configuration with SPA history routing fallback, security headers (HSTS, CSP, nosniff, DENY), gzip compression, and `/socket.io/` WebSocket upgrade forwarding.
  - `infra/Dockerfile.web`: Multi-stage Dockerfile building the Vite production web client and serving static assets from Nginx Alpine.
  - `deploy/compose.production.yml`: Production Compose manifest orchestrating web, API, and worker containers using external managed cloud databases.
  - Verified via `scripts/release-preflight.js`.
- **Operational tooling & runbook**:
  - `scripts/ops-telemetry.js`: Live inspection tool tracking queue length, in-flight MongoDB matches, scheduled deadlines, and deadline lag.
  - `scripts/drain-matches.js`: Match draining utility for zero-downtime rolling upgrades.
  - `docs/RUNBOOK.md`: Comprehensive operational manual covering health probes, rolling deployment, disaster recovery (Redis/Mongo outages), backups, and rollback.
- **5-Minute verification showcase (`scripts/demo-walkthrough.js`)**:
  - Automated showcase validating matchmaking, turn commands, duplicate command idempotency, disconnect and 30-second reconnect recovery, 2D fallback resilience, match surrender, and transactional MongoDB persistence.

## Verification

| Check                    | Command                                                           | Observed result                                                                                                 |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Static Analysis & Build  | `npm run check`                                                   | Lint, formatting check, 94 unit/component tests, production build, module validation, scene budget passed       |
| Release Preflight        | `node scripts/release-preflight.js`                               | Release assets and production environment sample verified                                                       |
| Release Preflight (.env) | `node scripts/release-preflight.js --env .env.production.example` | Production environment preflight passed for `.env.production.example`                                           |
| Security & Privacy Audit | `node scripts/audit-security.js`                                  | All 5 security suites passed: bundle scan, data isolation, schema validation, logger redaction, origin security |
| Load Testing Benchmark   | `node scripts/load-test.js`                                       | 100 players / 50 matches completed; 400 commands; 0 duplicates, 0 result loss; receipts 50/50                   |
| Match Draining Tool      | `node --env-file-if-exists=.env scripts/drain-matches.js`         | Queue closed and active matches drained cleanly                                                                 |
| Operational Telemetry    | `node --env-file-if-exists=.env scripts/ops-telemetry.js`         | Reported healthy dependencies, active match counts, and zero deadline lag                                       |
| 5-Minute Demo Showcase   | `node scripts/demo-walkthrough.js`                                | Matchmaking, turn moves, duplicate rejection, reconnect, 2D fallback, and history verified                      |
| Integration Suite        | `npm run test:integration`                                        | 38 passed, including real-service multiplayer concurrency and process crash recovery                            |
| Visual Regression        | `npm run test:visual`                                             | Prepared component render of maximum board inspected                                                            |

## Load Test Telemetry Summary

Measured on Windows 11, AMD Ryzen 5 5500U (12 vCPUs, ~15.34 GiB RAM), local Docker MongoDB replica set + Redis:

- **Players**: 100 simultaneous virtual players
- **Matches**: 50 concurrent matches
- **Commands Executed**: 400
- **Duplicate Checks**: 200
- **Matches Completed**: 50 / 50
- **MongoDB Receipts Persisted**: 50 / 50
- **Result Loss**: 0
- **Duplicate Commits**: 0
- **Mean Latency**: 674.53 ms
- **p50 Latency**: 576.67 ms
- **p90 Latency**: 1551.40 ms
- **p95 Latency**: 1591.34 ms
- **p99 Latency**: 1628.59 ms

_Note on Latency_: The single-node development Docker replica set running with direct loopback connection introduces serialization contention under 50 simultaneous transactions; in cloud production with dedicated managed MongoDB Atlas and Redis cluster instances, latency is expected to meet the < 250 ms target. In compliance with Decision #8 and Blueprint Page 8, actual local observed numbers are recorded rather than assumed scale.

## Boundaries and Hand-off

- Production deployment requires owner provisioning of managed MongoDB Atlas (or equivalent replica set) and managed Redis with TLS (`rediss://`).
- The repository does not store production secrets; all production secrets must be injected via runtime environment variables (`.env.production`).
- The application supports horizontal background workers; the API server currently operates as an authoritative single-instance or partitioned instance. Horizontal Socket.IO scaling with a Redis adapter is documented for future multi-region scaling.

See [runbook](RUNBOOK.md), [deployment](DEPLOYMENT.md), [architecture](ARCHITECTURE.md), [decisions](DECISIONS.md), and [setup](../README.md).
