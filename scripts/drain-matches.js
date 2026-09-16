import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseConfig } from '../packages/shared/src/server/config.js';

export async function drainMatches(options = {}) {
  const timeoutMs = options.timeoutMs || 45000;
  const pollIntervalMs = options.pollIntervalMs || 1000;
  const config = parseConfig(process.env);
  const logger = createLogger('drain-matches', 'silent');
  const dependencies = createDependencies(config, logger);
  dependencies.start();

  console.log('====================================================');
  console.log('         Mythic Arena — Match Draining              ');
  console.log('====================================================');
  console.log('1. Closing casual matchmaking queue...');

  const redis = dependencies.redis;
  const db = dependencies.mongo.db(config.MONGODB_DB);

  // Clear queue so no new reservations are formed
  const queueKey = `${config.GAME_PREFIX}queue`;
  await redis.del(queueKey).catch(() => {});
  console.log('   ✓ Matchmaking queue cleared and closed to new entrants.');

  console.log('2. Monitoring in-flight matches to completion...');
  const start = Date.now();
  let remaining = await db.collection('active_matches').countDocuments();

  while (remaining > 0 && Date.now() - start < timeoutMs) {
    console.log(
      `   • Waiting for ${remaining} in-flight match(es) to finish... (${Math.round((Date.now() - start) / 1000)}s elapsed)`,
    );
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    remaining = await db.collection('active_matches').countDocuments();
  }

  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  if (remaining === 0) {
    console.log(`   ✓ All active matches completed cleanly in ${elapsedSec}s.`);
    console.log(
      '3. Safe to restart, deploy container updates, or perform maintenance.',
    );
    console.log('====================================================');
    await dependencies.close();
    return { success: true, remaining: 0, elapsedSec };
  } else {
    console.warn(
      `   ⚠️ Timeout reached after ${elapsedSec}s. ${remaining} match(es) still active.`,
    );
    console.log('====================================================');
    await dependencies.close();
    return { success: false, remaining, elapsedSec };
  }
}

if (process.argv[1] && process.argv[1].endsWith('drain-matches.js')) {
  drainMatches().catch((err) => {
    console.error('Drain error:', err);
    process.exit(1);
  });
}
