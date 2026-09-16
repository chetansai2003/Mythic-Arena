import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseConfig } from '../packages/shared/src/server/config.js';

export async function getOperationsTelemetry() {
  const config = parseConfig(process.env);
  const logger = createLogger('ops-telemetry', 'silent');
  const dependencies = createDependencies(config, logger);
  dependencies.start();

  try {
    let health = { redis: false, mongo: false };
    for (let i = 0; i < 10; i++) {
      health = await dependencies
        .check()
        .catch(() => ({ redis: false, mongo: false }));
      if (health.redis && health.mongo) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!health.redis || !health.mongo) {
      return {
        status: 'UNAVAILABLE',
        dependencies: health,
        timestamp: new Date().toISOString(),
      };
    }

    const redis = dependencies.redis;
    const db = dependencies.mongo.db(config.MONGODB_DB);

    // Scan Redis for active games and queues
    const prefix = config.GAME_PREFIX;
    let queueLength = 0;
    const now = Date.now();

    // Check matchmaking queue
    const queueCard = await redis.zCard(`${prefix}queue`).catch(() => 0);
    queueLength = queueCard || 0;

    // Check active matches in MongoDB
    const activeMatchesMongo = await db
      .collection('active_matches')
      .countDocuments();

    // Check deadlines sorted set
    const deadlinesCount = await redis
      .zCount(`${prefix}deadlines`, '-inf', '+inf')
      .catch(() => 0);
    const overdueCount = await redis
      .zCount(`${prefix}deadlines`, '-inf', now)
      .catch(() => 0);

    // Total persisted matches
    const totalFinishedMatches = await db
      .collection('matches')
      .countDocuments();
    const totalRegisteredUsers = await db.collection('users').countDocuments();

    return {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      dependencies: health,
      queue: {
        waitingPlayers: queueLength,
      },
      matches: {
        activeInMongo: activeMatchesMongo,
        scheduledDeadlines: deadlinesCount,
        overdueDeadlinesLag: overdueCount,
        totalPersisted: totalFinishedMatches,
      },
      users: {
        registeredCount: totalRegisteredUsers,
      },
    };
  } finally {
    await dependencies.close();
  }
}

export async function run() {
  console.log('====================================================');
  console.log('       Mythic Arena — Operational Telemetry         ');
  console.log('====================================================');
  const metrics = await getOperationsTelemetry();
  console.log(JSON.stringify(metrics, null, 2));
  console.log('====================================================');
}

if (process.argv[1] && process.argv[1].endsWith('ops-telemetry.js')) {
  run().catch((err) => {
    console.error('Failed to get operational telemetry:', err);
    process.exit(1);
  });
}
