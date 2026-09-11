import { execFileSync } from 'node:child_process';

export default function cleanup() {
  execFileSync(process.execPath, ['scripts/cleanup-e2e.js'], {
    stdio: 'inherit',
    env: process.env,
  });
}
