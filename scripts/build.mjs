#!/usr/bin/env node
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hasServer = existsSync(join(root, 'server', 'package.json'));
const hasGui = existsSync(join(root, 'gui', 'package.json'));

function run(label, args) {
  console.log(`\n[build] ▶ ${label}`);
  const r = spawnSync('npm', args, { stdio: 'inherit', cwd: root, shell: true });
  if (r.status !== 0) {
    console.error(`[build] ✖ ${label} failed (exit ${r.status})`);
    process.exit(r.status || 1);
  }
  console.log(`[build] ✓ ${label}`);
}

console.log(`[build] root=${root}`);
console.log(`[build] workspaces: server=${hasServer} gui=${hasGui}`);

if (!hasServer && !hasGui) {
  console.error('[build] No workspace found (server/ or gui/). Check Base Directory in Coolify.');
  process.exit(1);
}

if (hasServer) run('server (tsc)', ['run', 'build', '-w', 'server']);
if (hasGui) run('gui (next build)', ['run', 'build', '-w', 'gui']);

console.log('\n[build] done');
