import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

function compose(...args) {
  execFileSync('docker', ['compose', '-f', 'docker-compose.yml', ...args], {
    stdio: 'inherit',
  });
}
async function status(port, kind) {
  const response = await fetch(`http://127.0.0.1:${port}/health/${kind}`, {
    signal: AbortSignal.timeout(3000),
  });
  return response.status;
}
try {
  compose('stop', 'redis');
  for (const port of [3001, 3002]) {
    assert.equal(await status(port, 'ready'), 503);
    assert.equal(await status(port, 'live'), 200);
  }
  console.log('Actual Redis outage: API/worker readiness 503, liveness 200.');
} finally {
  compose('start', 'redis');
}
for (let attempt = 0; attempt < 30; attempt++) {
  if (
    (await status(3001, 'ready')) === 200 &&
    (await status(3002, 'ready')) === 200
  ) {
    console.log(
      'API and worker automatically recovered readiness after Redis restart.',
    );
    process.exit(0);
  }
  await delay(1000);
}
throw new Error('Services did not recover within 30 seconds');
