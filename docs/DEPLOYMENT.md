# Local deployment

From the repository root, with Node 22.17.0, npm 10.9.2 and Docker Desktop running:

```sh
npm ci
npm run setup
docker compose up -d --build --wait
```

Open http://localhost:5173/lobby. Register an account, open My decks, and save a valid 30-card deck. No user credentials are seeded.

Compose builds one shared application image, initializes the MongoDB replica set, seeds the card catalog/indexes, and starts the API, worker and frontend. MongoDB and Redis volumes survive ordinary shutdown. Authentication secrets come from the ignored root `.env`, loaded only into the API and setup containers.

```sh
docker compose ps
node scripts/smoke-stack.js
node scripts/recovery-stack.js
docker compose down
```

The recovery check temporarily stops this project's Redis service and verifies readiness failure, continuing liveness, and automatic recovery. It is intended for the local development stack.

Step 4 requires both API and worker to remain running. They share `MONGODB_DB` and `GAME_PREFIX` (default `${MONGODB_DB}:game:`). Redis must use persistent storage and MongoDB must support transactions. The setup service upgrades schema metadata/indexes to version 3 without resetting account or deck data. Reverse proxies must forward WebSocket upgrades at `/socket.io` and preserve the browser Origin. Allowed origins must match exactly. This milestone supports a single API process and one Redis instance.

For host development and troubleshooting, see [README](../README.md).

## Production and staging deployment

Step 6 provides production deployment assets for running with managed external cloud databases:

- Configuration: `.env.production.example`
- Web Proxy: `infra/nginx.conf` and `infra/Dockerfile.web`
- Production Compose: `deploy/compose.production.yml`
- Operations Runbook: [RUNBOOK.md](RUNBOOK.md)

### Deployment steps

1. **Verify configuration & preflight**:
   ```sh
   node scripts/release-preflight.js --env .env.production
   ```
2. **Run database migrations independently**:
   ```sh
   node backend/src/setup.js
   ```
3. **Deploy production containers**:
   ```sh
   docker compose -f deploy/compose.production.yml up -d
   ```
4. **Inspect operational telemetry**:
   ```sh
   node --env-file-if-exists=.env scripts/ops-telemetry.js
   ```

Reverse proxies forward WebSocket upgrades at `/socket.io/`, preserve the browser `Origin`, and serve static assets with gzip and immutable cache headers. Production requires HTTPS origins and external managed databases. See [RUNBOOK.md](RUNBOOK.md) for zero-downtime rolling updates, match draining, and disaster recovery procedures.
