#!/usr/bin/env node
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hasServer = existsSync(join(root, 'server', 'package.json'));
const hasGui = existsSync(join(root, 'gui', 'package.json'));

function start(label, args) {
  console.log(`[start] ▶ ${label}`);
  const child = spawn('npm', args, { stdio: 'inherit', cwd: root, shell: true });
  child.on('exit', (code) => process.exit(code ?? 1));
}

// Prefer server if only one process allowed; otherwise both via concurrently
if (hasServer && hasGui) {
  spawn(
    'npx',
    ['concurrently', '-n', 'server,gui', '-c', 'cyan,magenta', 'npm run start -w server', 'npm run start -w gui'],
    { stdio: 'inherit', cwd: root, shell: true }
  ).on('exit', (code) => process.exit(code ?? 1));
} else if (hasGui) {
  start('gui', ['run', 'start', '-w', 'gui']);
} else if (hasServer) {
  start('server', ['run', 'start', '-w', 'server']);
} else {
  console.error('[start] No workspace found');
  process.exit(1);
}
