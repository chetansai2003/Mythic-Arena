# Step 6 — release, verification, and deployment

Implement Part 6 of the six-part specification in JavaScript/JSX. Maintain the pure engine, secure account/deck persistence, durable Redis/Mongo multiplayer lifecycle, and progressive 3D graphics.

1. **Test matrix hardening**: Verify linting, formatting, unit/component tests, bundle budgets, and module isolation. Ensure clean execution across environments.
2. **Security and privacy audit**: Provide automated testing for socket payload validation, origin enforcement, token rotation/revocation, cross-user isolation, rate limiting, and zero private-hand/deck leakage. Confirm credential redaction in logs and client bundle secret absence.
3. **Declared target load testing**: Implement multi-client load simulation for 100 simultaneous players across 50 matches. Benchmark latency against the p95 < 250ms target and verify zero duplicate commits and zero result loss.
4. **Staging and production deployment**: Provide clean production environment templates (`.env.production.example`), Nginx reverse proxy configuration (`infra/nginx.conf`), multi-stage frontend container (`infra/Dockerfile.web`), and production compose manifest (`deploy/compose.production.yml`) relying on managed external databases.
5. **Operational runbook and disaster recovery**: Document zero-downtime rolling upgrades, graceful match draining (`scripts/drain-matches.js`), operational telemetry inspection (`scripts/ops-telemetry.js`), backup/restore, and rollback procedures.
6. **Publication and demo**: Publish complete Part 6 delivery evidence, update architecture decisions and deployment documentation, and provide an automated 5-minute showcase script (`scripts/demo-walkthrough.js`).
