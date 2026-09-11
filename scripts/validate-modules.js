import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function validate(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules')
      await validate(file);
    else if (file.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', file], {
        stdio: 'inherit',
      });
      if (result.status !== 0)
        throw new Error(`Syntax validation failed: ${file}`);
    }
  }
}
for (const directory of ['backend/src', 'packages/shared/src'])
  await validate(directory);
await Promise.all([
  import('@mythic/shared'),
  import('@mythic/shared/server'),
  import('@mythic/game-engine'),
  import('../backend/src/app.js'),
  import('../backend/src/routes/index.js'),
  import('../backend/src/workers/src/app.js'),
]);
console.log('Server syntax and side-effect-free package imports verified.');
