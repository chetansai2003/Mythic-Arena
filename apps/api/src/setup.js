import { createDependencies, createLogger } from '@mythic/shared/server';
import { parseApiConfig } from './config.js';
import { setupDatabase } from './database.js';

let dependencies;
try {
  const config = parseApiConfig(process.env);
  dependencies = createDependencies(config, createLogger('setup', config.LOG_LEVEL));
  await setupDatabase(dependencies.mongo.db(config.MONGODB_DB));
  console.log('Database indexes and 20 versioned original cards are ready.');
} catch (error) {
  console.error(error.message.startsWith('Invalid environment fields:') ? error.message : 'Database setup failed. Check connectivity, replica-set readiness, and immutable catalog definitions.');
  process.exitCode = 1;
} finally { await dependencies?.close(); }
