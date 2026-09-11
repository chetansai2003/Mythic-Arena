import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

let source;
try {
  source = await readFile('.env', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  source = await readFile('.env.example', 'utf8');
}
if (!/^AUTH_SECRET=/m.test(source))
  source += '\nAUTH_SECRET=replace-with-a-generated-secret\n';
source = source.replace(/^AUTH_SECRET=(.*)$/m, (line, value) =>
  /replace|example|placeholder/i.test(value) || value.trim().length < 32
    ? `AUTH_SECRET=${randomBytes(48).toString('hex')}`
    : line,
);
await writeFile('.env', source, { mode: 0o600 });
console.log(
  'Local .env is ready. Existing configuration preserved; secret values are not printed.',
);
