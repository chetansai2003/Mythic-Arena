import assert from 'node:assert/strict';
for (const url of [
  'http://127.0.0.1:3001/health/ready',
  'http://127.0.0.1:3002/health/ready',
  'http://127.0.0.1:5173/api/health/ready',
]) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, url);
  assert.equal((await response.json()).status, 'ready', url);
}
for (const path of ['/', '/lobby', '/decks', '/settings', '/match/preview']) {
  const response = await fetch(`http://127.0.0.1:5173${path}`);
  assert.equal(response.status, 200, path);
  assert.match(await response.text(), /<div id="root">/, path);
}
console.log('Full-stack health, API proxy, and deep links passed.');
