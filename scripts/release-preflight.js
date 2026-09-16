import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseApiConfig } from '../backend/src/config/env.js';
import { parseConfig } from '../packages/shared/src/server/config.js';

const requiredReleaseFiles = [
  '.env.production.example',
  'deploy/compose.production.yml',
  'infra/Dockerfile.web',
  'infra/nginx.conf',
];

export function parseEnvText(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) throw new Error(`Invalid env line: ${trimmed}`);
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

export function productionSampleEnv() {
  return {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    API_PORT: '3001',
    WORKER_PORT: '3002',
    REDIS_URL: 'rediss://redis.example.com:6379',
    MONGODB_URI:
      'mongodb+srv://mythic_app:password@cluster.example.com/mythic_arena',
    MONGODB_DB: 'mythic_arena',
    FRONTEND_ORIGINS: 'https://arena.example.com',
    LOG_LEVEL: 'info',
    AUTH_SECRET: 'release-preflight-only-64-byte-secret-value-for-validation',
    ACCESS_TOKEN_SECONDS: '600',
    REFRESH_DAYS: '7',
    RELEASE_VERSION: '2026.09.15',
  };
}

export function validateReleaseEnvironment(env) {
  const api = parseApiConfig(env);
  const worker = parseConfig(env);
  assert.equal(api.NODE_ENV, 'production', 'NODE_ENV must be production');
  assert.equal(worker.NODE_ENV, 'production', 'worker NODE_ENV mismatch');
  assert.ok(
    api.FRONTEND_ORIGINS.every((origin) => origin.startsWith('https://')),
    'production frontend origins must be HTTPS',
  );
  assert.match(
    api.RELEASE_VERSION,
    /^[a-zA-Z0-9._:-]{1,80}$/,
    'RELEASE_VERSION must be a compact release identifier',
  );
  return { api, worker };
}

export function validateReleaseAssets(root = process.cwd()) {
  const missing = requiredReleaseFiles.filter(
    (file) => !existsSync(resolve(root, file)),
  );
  assert.deepEqual(missing, [], `Missing release files: ${missing.join(', ')}`);

  const compose = readFileSync(
    resolve(root, 'deploy/compose.production.yml'),
    'utf8',
  );
  for (const fragment of [
    'NODE_ENV: production',
    '/health/ready',
    '/health/live',
    '/socket.io',
    'MYTHIC_APP_IMAGE',
  ])
    assert.ok(
      compose.includes(fragment),
      `Production compose must include ${fragment}`,
    );
  assert.ok(
    !/^\s+(mongo|redis):\s*$/m.test(compose),
    'Production compose must use managed MongoDB and Redis, not bundled databases',
  );

  const nginx = readFileSync(resolve(root, 'infra/nginx.conf'), 'utf8');
  assert.ok(nginx.includes('try_files'), 'Nginx must support SPA deep links');
  assert.ok(
    nginx.includes('proxy_set_header Upgrade'),
    'Nginx must forward WebSocket upgrades',
  );
  assert.ok(
    nginx.includes('proxy_pass http://api:3001'),
    'Nginx must proxy API traffic to the API service',
  );

  const webDockerfile = readFileSync(
    resolve(root, 'infra/Dockerfile.web'),
    'utf8',
  );
  assert.ok(
    webDockerfile.includes('npm run build -w @mythic/web'),
    'Web image must build the production frontend',
  );
  assert.ok(
    webDockerfile.includes('nginx'),
    'Web image must serve built assets from nginx',
  );
}

export function readEnvFile(path) {
  return parseEnvText(readFileSync(path, 'utf8'));
}

export function run(args = process.argv.slice(2), root = process.cwd()) {
  const envIndex = args.indexOf('--env');
  const env =
    envIndex >= 0 ? readEnvFile(resolve(root, args[envIndex + 1])) : null;
  validateReleaseAssets(root);
  validateReleaseEnvironment(env ?? productionSampleEnv());
  if (env)
    console.log(
      `Production environment preflight passed for ${basename(args[envIndex + 1])}.`,
    );
  else
    console.log('Release assets and production configuration sample passed.');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  run();
