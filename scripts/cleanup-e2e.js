import { readFile, unlink } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';

async function cleanup() {
  const id = process.env.MYTHIC_E2E_RUN_ID;
  if (!/^[a-f0-9]{32}$/.test(id ?? '')) return;
  const file = `.local/e2e-${id}.json`;
  let record;
  try {
    record = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (
    record.database !== `mythic_e2e_${id}` ||
    record.prefix !== `${record.database}:`
  )
    throw new Error('Refusing to clean an unrecognized test namespace');
  const mongo = new MongoClient(
    process.env.TEST_MONGODB_URI ||
      'mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true',
    { serverSelectionTimeoutMS: 3000 },
  );
  const redis = createClient({
    url: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379',
    socket: { reconnectStrategy: false },
  });
  redis.on('error', () => {});
  try {
    await mongo.db(record.database).dropDatabase();
    await redis.connect();
    let cursor = '0';
    do {
      const result = await redis.scan(cursor, {
        MATCH: `${record.prefix}*`,
        COUNT: 100,
      });
      if (result.keys.length) await redis.del(result.keys);
      cursor = String(result.cursor);
    } while (cursor !== '0');
    await unlink(file);
  } finally {
    if (redis.isOpen) redis.destroy();
    await mongo.close();
  }
}

await cleanup();
