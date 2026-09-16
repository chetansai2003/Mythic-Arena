# Mythic Arena Operations Runbook

This runbook defines production operations, monitoring, disaster recovery, rolling updates, and rollback procedures for Mythic Arena.

---

## 1. System Topology & Architecture

Mythic Arena is a modular monolith composed of:

- **`web`**: Nginx reverse proxy serving the compiled React 19 SPA, proxying `/api/` and upgrading WebSocket connections on `/socket.io/`.
- **`api`**: Node.js Express 5 + Socket.IO server handling authentication, card catalogs, deck persistence, matchmaking, and state synchronization.
- **`worker`**: Standalone Node.js background process monitoring turn/disconnect deadlines in Redis and executing transactional match persistence to MongoDB.
- **`Redis`**: High-performance in-memory store maintaining matchmaking queues, active match CAS state, session control leases, and deadline schedules.
- **`MongoDB Replica Set`**: Persistent transactional database storing accounts, hashed credentials, cards, decks, and immutable completed match receipts.

---

## 2. Health Checks & Telemetry

### HTTP Probes

| Service          | Endpoint                              | Target Status | Description                                                                       |
| ---------------- | ------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| API Liveness     | `GET http://<host>:3001/health/live`  | `200 OK`      | Process is running and responsive.                                                |
| API Readiness    | `GET http://<host>:3001/health/ready` | `200 OK`      | Redis ping responds, MongoDB is writable primary, and schema metadata is current. |
| Worker Liveness  | `GET http://<host>:3002/health/live`  | `200 OK`      | Worker process is healthy.                                                        |
| Worker Readiness | `GET http://<host>:3002/health/ready` | `200 OK`      | Redis and MongoDB are reachable.                                                  |

### Operational Telemetry Tool

Run operational inspection at any time:

```sh
node --env-file-if-exists=.env scripts/ops-telemetry.js
```

Reports active matchmaking queue length, in-flight matches in MongoDB, scheduled Redis deadlines, and overdue deadline lag.

---

## 3. Zero-Downtime Deployment & Rolling Updates

Before updating the API or worker containers in production:

### Step 1: Preflight Verification

Verify release assets and target production environment:

```sh
node scripts/release-preflight.js --env .env.production
```

### Step 2: Database Migration & Seed Verification

Run database migrations/indexes independently of application container startup:

```sh
node backend/src/setup.js
```

### Step 3: Graceful Match Draining

Drain matchmaking queues to prevent new matches from forming and allow in-flight matches to conclude:

```sh
node --env-file-if-exists=.env scripts/drain-matches.js
```

Once `scripts/drain-matches.js` reports 0 active matches, proceed with container updates.

### Step 4: Container Update

Deploy updated images using Docker Compose:

```sh
docker compose -f deploy/compose.production.yml pull
docker compose -f deploy/compose.production.yml up -d --remove-orphans
```

Verify readiness endpoints before rerouting traffic.

---

## 4. Disaster Recovery & Failure Handling

### Redis Outage

- **Behavior**: API and Worker readiness probes drop to `503 Service Unavailable`. HTTP requests requiring Redis fail gracefully with safe `DEPENDENCY_UNAVAILABLE` errors.
- **In-Flight State Policy**: Active match state in Redis is protected; the application deliberately refuses to fall back to independent local state or unverified in-memory state.
- **Recovery**:
  1. Restore Redis connectivity.
  2. Verify readiness returns to `200 OK`.
  3. The API and worker automatically re-establish connections with backoff. In-flight matches whose presence leases survived resume cleanly. Unrecoverable active matches whose presence expired abort safely (`STATE_LOST`) without incorrect leaderboard credit.

### MongoDB Outage

- **Behavior**: Readiness drops to `503`. New registrations, logins, and deck edits fail.
- **Active Gameplay Behavior**: Active games in Redis continue running turns. When games reach `TERMINAL` status, the result status is marked `PENDING` in Redis.
- **Recovery**:
  1. Restore MongoDB replica set primary.
  2. The background worker automatically retries persisting pending match receipts from Redis without duplicate increments. Once MongoDB commits the transaction, result status transitions to `PERSISTED`.

### Container Crash / Process Restart

- API crashes cause client WebSocket disconnects.
- Clients receive a 30-second disconnect grace window (`LIMITS.reconnectMs = 30000`).
- Reconnecting within 30 seconds automatically requests an authoritative state snapshot via `state:request` and resumes play without losing turn state.

---

## 5. Backup and Restore Procedures

### MongoDB Backup

Take automated periodic snapshots of the MongoDB database:

```sh
mongodump --uri="mongodb+srv://user:pass@cluster.example.com/mythic_arena" --out=/backups/mongo-$(date +%F-%H%M)
```

### MongoDB Restore

To restore data to a staging or recovery cluster:

```sh
mongorestore --uri="mongodb+srv://user:pass@cluster.example.com/mythic_arena" --drop /backups/mongo-<timestamp>/mythic_arena
```

### Redis State Persistence

Redis runs with Append-Only File (`appendonly yes`) enabled. Back up `appendonly.aof` and `dump.rdb` from the persistent data volume before infrastructure maintenance.

---

## 6. Rollback Runbook

If a critical defect or regression is identified post-deployment:

1. **Trigger Immediate Drain**:
   ```sh
   node --env-file-if-exists=.env scripts/drain-matches.js
   ```
2. **Revert Compose Image Tags**:
   Update `deploy/compose.production.yml` to reference the previous known-good release tag:
   ```sh
   export MYTHIC_APP_IMAGE=mythic-arena:previous_release_tag
   export MYTHIC_WEB_IMAGE=mythic-arena-web:previous_release_tag
   docker compose -f deploy/compose.production.yml up -d
   ```
3. **Validate Restored Readiness**:
   ```sh
   node --env-file-if-exists=.env scripts/ops-telemetry.js
   ```
4. **Database Rollback Note**:
   Card definitions and match receipts are immutable and forward-compatible. Database schema versions are idempotent and backward-compatible with the previous release.
