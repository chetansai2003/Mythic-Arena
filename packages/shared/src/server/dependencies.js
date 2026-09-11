import { createClient } from 'redis';
import { MongoClient } from 'mongodb';

export async function within(promise, ms = 1200) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Dependency timeout')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function createDependencies(config, logger) {
  const redis = createClient({
    url: config.REDIS_URL,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: (retries) => Math.min(100 * (retries + 1), 2000),
    },
  });
  const mongo = new MongoClient(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 1000,
    connectTimeoutMS: 1000,
    socketTimeoutMS: 1500,
  });
  redis.on('error', () =>
    logger.warn({ dependency: 'redis' }, 'Dependency connection unavailable'),
  );
  let connecting = false;
  return {
    redis,
    mongo,
    start() {
      if (!connecting) {
        connecting = true;
        redis
          .connect()
          .catch(() =>
            logger.warn({ dependency: 'redis' }, 'Connection stopped'),
          );
      }
    },
    async check() {
      const results = await Promise.allSettled([
        within(redis.ping()),
        within(
          mongo
            .db(config.MONGODB_DB)
            .admin()
            .command({ hello: 1 })
            .then((hello) => {
              if (!hello.isWritablePrimary || !hello.setName)
                throw new Error('Replica set primary unavailable');
            }),
        ),
      ]);
      return {
        redis: results[0].status === 'fulfilled',
        mongo: results[1].status === 'fulfilled',
      };
    },
    async close() {
      if (redis.isOpen) redis.destroy();
      await mongo.close();
    },
  };
}
