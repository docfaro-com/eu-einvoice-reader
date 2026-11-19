#!/usr/bin/env node
/*
 * Downloads the official and third-party sample invoices listed in test/fixtures.json into fixtures/ (gitignored).
 * Several of them may not be redistributed, so they are never committed; each file is checked against its pinned
 * SHA-256. A failed download is reported and skipped, and the tests that need the file are skipped too.
 * Behind a proxy on Node 24+: NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://host:port npm run fixtures
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.env.FIXTURES_DIR ?? join(root, 'fixtures');
const manifest = JSON.parse(readFileSync(join(root, 'test/fixtures.json'), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const cache = new Map();
async function download(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      })(),
    );
  }
  return cache.get(url);
}

let ok = 0;
let failed = 0;
for (const entry of manifest) {
  const target = join(outDir, entry.path);
  if (existsSync(target) && sha256(readFileSync(target)) === entry.sha256) {
    ok++;
    continue;
  }
  try {
    let bytes = await download(entry.url);
    if (entry.zipEntry !== undefined) {
      if (sha256(bytes) !== entry.zipSha256) throw new Error('archive checksum mismatch');
      // The archive's member names carry Polish characters in a legacy encoding, so members are matched by number.
      const files = unzipSync(bytes);
      const name = Object.keys(files).find((n) => new RegExp(`_${entry.zipEntry}\\.xml$`, 'i').test(n));
      if (!name) throw new Error(`member ${entry.zipEntry} not found in archive`);
      bytes = files[name];
    }
    const got = sha256(bytes);
    if (got !== entry.sha256) throw new Error(`checksum mismatch (got ${got})`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    ok++;
  } catch (e) {
    failed++;
    console.warn(`skip ${entry.path}: ${e.message} (${entry.url})`);
  }
}
console.log(`fixtures: ${ok} ready, ${failed} unavailable, in ${outDir}`);
