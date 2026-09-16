import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseApiConfig } from '../backend/src/config/env.js';
import { setupDatabase } from '../backend/src/models/database.js';
import { createGameService } from '../backend/src/services/realtime/gameService.js';
import { CATALOG } from '../backend/src/models/cards.js';

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export async function runLoadTest(options = {}) {
  const playerCount = options.players || 100;
  const matchCount = Math.floor(playerCount / 2);
  const durationSec = options.duration || 15;
  const targetP95Ms = 250;
  const namespace = `mythic_load_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;

  console.log('====================================================');
  console.log('       Mythic Arena — Step 6 Load Testing           ');
  console.log('====================================================');
  console.log(
    `Target: ${playerCount} simultaneous players across ${matchCount} matches`,
  );
  console.log(`Duration target: ${durationSec}s active load benchmark`);
  console.log(
    `Goal: p95 command latency < ${targetP95Ms} ms, 0 duplicates, 0 result loss`,
  );
  console.log('----------------------------------------------------');

  const config = parseApiConfig({
    NODE_ENV: 'test',
    REDIS_URL:
      process.env.TEST_REDIS_URL ||
      process.env.REDIS_URL ||
      'redis://127.0.0.1:6379',
    MONGODB_URI:
      process.env.TEST_MONGODB_URI ||
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
    MONGODB_DB: namespace,
    FRONTEND_ORIGINS: 'http://127.0.0.1:5173',
    AUTH_SECRET: 'local-load-test-secret-'.repeat(4),
  });

  const dependencies = createDependencies(
    config,
    createLogger('load-test', 'silent'),
  );
  dependencies.start();

  // Await connectivity
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const check = await dependencies.check().catch(() => ({}));
    if (check.redis && check.mongo) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    console.warn(
      '⚠️ Redis or MongoDB replica set not reachable. Skipping live load execution; recording environment & requirements.',
    );
    return {
      environment: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      },
      skipped: true,
      reason: 'Dependencies offline during test run',
    };
  }

  const db = dependencies.mongo.db(namespace);
  await setupDatabase(db);

  const now = Date.now;

  const deckService = {
    async snapshotForMatch(userId, _deckId) {
      return {
        cards: CATALOG.slice(0, 15).flatMap((definition, n) =>
          [0, 1].map((copy) => ({
            instanceId: `${userId}_card_${n}_${copy}`,
            definition,
          })),
        ),
      };
    },
  };

  const games = createGameService({
    dependencies,
    config,
    deckService,
    now,
  });

  // Create virtual players
  const players = Array.from({ length: playerCount }, (_, i) => {
    const id = `load_user_${i}`;
    const token = `tok_${i}:${randomUUID()}`;
    return {
      id,
      displayName: `Player ${i}`,
      token,
      deckId: `deck_${i}`,
    };
  });

  // Pair up and matchmake
  console.log(`• Joining casual queue for ${playerCount} players...`);
  const matchIds = new Set();
  for (let i = 0; i < playerCount; i += 2) {
    const p1 = players[i];
    const p2 = players[i + 1];

    await games.claim(p1.id, randomUUID(), p1.token, false);
    await games.claim(p2.id, randomUUID(), p2.token, false);

    const r1 = await games.join(p1, p1.deckId, p1.token);
    assert.equal(r1.gameId, undefined);

    const r2 = await games.join(p2, p2.deckId, p2.token);
    assert.ok(r2.gameId, 'Second entrant should create gameId');

    matchIds.add(r2.gameId);
  }

  console.log(`  ✓ Formed ${matchIds.size} concurrent matches.`);

  // Both players ready up
  console.log('• Confirming readiness across all matches...');
  for (const gameId of matchIds) {
    const { record } = await games.update(gameId);
    for (const player of record.state.players) {
      const user = players.find((p) => p.id === player.id);
      await games.ready(gameId, user.id, user.token);
    }
  }

  // Issue game commands concurrently and record latency
  console.log('• Simulating concurrent player turns & commands...');
  const latencies = [];
  let duplicateRejections = 0;
  let commandsSubmitted = 0;
  let matchesCompleted = 0;

  const matchPromises = Array.from(matchIds).map(async (gameId) => {
    const { record } = await games.update(gameId);
    const p1 = players.find((p) => p.id === record.state.players[0].id);
    const p2 = players.find((p) => p.id === record.state.players[1].id);

    // Each match runs 6 actions (plays & end turns)
    for (let turn = 0; turn < 4; turn++) {
      const { record: cur } = await games.update(gameId);
      if (cur.state.status === 'TERMINAL') break;

      const activeUserId = cur.state.turn.playerId;
      const activePlayer = activeUserId === p1.id ? p1 : p2;
      const expectedVersion = cur.state.version;

      const actionId = randomUUID();
      const commandPayload = {
        gameId,
        actionId,
        expectedVersion,
        type: 'END_TURN',
        payload: {},
      };

      const start = performance.now();
      const res = await games.command(
        activePlayer.id,
        commandPayload,
        activePlayer.token,
      );
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
      commandsSubmitted++;

      assert.ok(res.ok, 'Command should succeed');

      // Test idempotency: send exact duplicate command
      const dupStart = performance.now();
      const dupRes = await games.command(
        activePlayer.id,
        commandPayload,
        activePlayer.token,
      );
      const dupElapsed = performance.now() - dupStart;
      latencies.push(dupElapsed);
      commandsSubmitted++;
      duplicateRejections++;

      assert.equal(
        dupRes.actionId,
        actionId,
        'Duplicate must return idempotent recorded receipt',
      );
    }

    // Explicit surrender to reach TERMINAL outcome
    const { record: finalCur } = await games.update(gameId);
    if (finalCur.state.status !== 'TERMINAL') {
      const surrenderCommand = {
        gameId,
        actionId: randomUUID(),
        expectedVersion: finalCur.state.version,
        type: 'SURRENDER',
        payload: {},
      };
      await games.command(p1.id, surrenderCommand, p1.token);
    }

    // Persist result
    await games.persist(gameId);
    matchesCompleted++;
  });

  await Promise.all(matchPromises);

  // Compute stats
  const p50 = percentile(latencies, 50);
  const p90 = percentile(latencies, 90);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log('----------------------------------------------------');
  console.log(`Commands Executed:      ${commandsSubmitted}`);
  console.log(`Duplicate Checks:       ${duplicateRejections}`);
  console.log(`Matches Finished:       ${matchesCompleted}/${matchCount}`);
  console.log(`Mean Latency:           ${avg.toFixed(2)} ms`);
  console.log(`p50 Latency:            ${p50.toFixed(2)} ms`);
  console.log(`p90 Latency:            ${p90.toFixed(2)} ms`);
  console.log(
    `p95 Latency:            ${p95.toFixed(2)} ms (Goal: < ${targetP95Ms} ms)`,
  );
  console.log(`p99 Latency:            ${p99.toFixed(2)} ms`);
  console.log('----------------------------------------------------');

  // Verify persistence in MongoDB
  const persistedMatches = await db.collection('matches').countDocuments();
  console.log(
    `Persisted receipts in MongoDB: ${persistedMatches}/${matchCount}`,
  );
  assert.equal(
    persistedMatches,
    matchCount,
    'Zero result loss: all matches must have durable receipts',
  );

  const duplicateCheck = await db
    .collection('matches')
    .aggregate([
      { $group: { _id: '$_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  assert.equal(duplicateCheck.length, 0, 'Zero duplicate receipts in database');

  // Clean up test namespace
  await db.dropDatabase();

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      totalMemoryGb: (os.totalmem() / 1024 ** 3).toFixed(2),
      nodeVersion: process.version,
    },
    target: {
      players: playerCount,
      matches: matchCount,
      targetP95Ms,
    },
    results: {
      commandsExecuted: commandsSubmitted,
      duplicateIdempotencyChecks: duplicateRejections,
      matchesCompleted,
      persistedReceipts: persistedMatches,
      resultLossCount: 0,
      duplicateCommitCount: 0,
      latenciesMs: {
        mean: Number(avg.toFixed(2)),
        p50: Number(p50.toFixed(2)),
        p90: Number(p90.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
      },
      p95Pass: p95 < targetP95Ms,
    },
  };

  const outputPath =
    options.output ||
    resolve(process.cwd(), 'docs/evidence/part-6-load-test.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✓ Load test telemetry saved to ${outputPath}`);
  console.log('====================================================');

  await dependencies.close();
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('load-test.js')) {
  runLoadTest().catch((err) => {
    console.error('Load test failed:', err);
    process.exit(1);
  });
}
