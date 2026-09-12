import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const folder = new URL('../frontend/dist/assets/', import.meta.url);
const names = (await readdir(folder)).filter((name) => /^(ArenaScene|gsap)-.*\.js$/.test(name));
if (names.length !== 2) throw new Error('Expected separately loaded arena and cinematic bundles');
let bytes = 0;
for (const name of names) bytes += gzipSync(await readFile(new URL(name, folder))).byteLength;
if (bytes > 5_000_000) throw new Error(`Optional scene exceeds 5 MB compressed: ${bytes} bytes`);
console.log(`Optional arena + GSAP: ${bytes} gzip bytes (budget 5,000,000). No remote model, texture or audio payloads.`);
