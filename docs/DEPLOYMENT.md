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

For host development and troubleshooting, see [README](../README.md). The supplied profile binds ports to loopback and is not a production deployment. Production provisioning, HTTPS termination and release operations belong to the final milestone. The GitHub workflow is configured but has not been run remotely in this workspace.
