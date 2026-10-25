/**
 * Production starter for Coolify / single-container deploys.
 * Starts Express API (PORT_API / 4000) + Next.js GUI (PORT).
 * Public traffic hits GUI; Next rewrites /api + /socket.io → API.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const API_PORT = process.env.PORT_API || process.env.API_PORT || '4000';
const GUI_PORT = process.env.PORT || process.env.GUI_PORT || '3000';

function run(name, cwd, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: false,
  });
  child.on('exit', (code) => {
    console.error(`[${name}] exited code=${code}`);
    process.exit(code ?? 1);
  });
  child.on('error', (err) => {
    console.error(`[${name}] failed:`, err);
    process.exit(1);
  });
  return child;
}

console.log(`[start-prod] API → :${API_PORT}  |  GUI → :${GUI_PORT}`);

// Prefer tsx (no compile), fallback to node dist if present
const serverEntry = path.join(root, 'server', 'src', 'index.ts');
const serverDist = path.join(root, 'server', 'dist', 'index.js');
const useTsx = fs.existsSync(serverEntry);
const tsxBin = path.join(root, 'node_modules', '.bin', 'tsx');
const tsxLocal = path.join(root, 'server', 'node_modules', '.bin', 'tsx');

let apiCmd, apiArgs;
if (useTsx) {
  const bin = fs.existsSync(tsxBin) ? tsxBin : (fs.existsSync(tsxLocal) ? tsxLocal : 'npx');
  if (bin === 'npx') {
    apiCmd = 'npx';
    apiArgs = ['tsx', 'src/index.ts'];
  } else {
    apiCmd = bin;
    apiArgs = ['src/index.ts'];
  }
} else if (fs.existsSync(serverDist)) {
  apiCmd = 'node';
  apiArgs = ['dist/index.js'];
} else {
  console.error('No server entry found');
  process.exit(1);
}

const api = run('server', path.join(root, 'server'), apiCmd, apiArgs, {
  PORT: API_PORT,
  NODE_ENV: 'production',
});

setTimeout(() => {
  const nextBin = path.join(root, 'gui', 'node_modules', 'next', 'dist', 'bin', 'next');
  const nextRoot = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const nextPath = fs.existsSync(nextBin) ? nextBin : nextRoot;
  run('gui', path.join(root, 'gui'), 'node', [nextPath, 'start', '-p', String(GUI_PORT)], {
    PORT: GUI_PORT,
    NODE_ENV: 'production',
    API_INTERNAL_URL: process.env.API_INTERNAL_URL || `http://127.0.0.1:${API_PORT}`,
  });
}, 2000);

process.on('SIGTERM', () => { api.kill('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { api.kill('SIGINT'); process.exit(0); });
