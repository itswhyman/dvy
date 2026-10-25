/**
 * Single-container production starter (Coolify / Docker).
 * - API on PORT_API (default 4000)
 * - Next.js GUI on PORT (default 3000)  ← public port
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_PORT = String(process.env.PORT_API || process.env.API_PORT || 4000);
const GUI_PORT = String(process.env.PORT || process.env.GUI_PORT || 3000);

function bin(name, workspace) {
  const candidates = [
    path.join(root, 'node_modules', '.bin', name),
    path.join(root, workspace, 'node_modules', '.bin', name),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return name; // fall back to PATH
}

function run(label, cwd, cmd, args, extraEnv = {}) {
  console.log(`[start] ${label}: ${cmd} ${args.join(' ')}`);
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    console.error(`[${label}] exited (${code})`);
    process.exit(code ?? 1);
  });
  child.on('error', (err) => {
    console.error(`[${label}] spawn error:`, err.message);
    process.exit(1);
  });
  return child;
}

console.log(`[start-prod] GUI :${GUI_PORT}  |  API :${API_PORT}`);
console.log(`[start-prod] API_INTERNAL_URL=${process.env.API_INTERNAL_URL || `http://127.0.0.1:${API_PORT}`}`);

const tsx = bin('tsx', 'server');
const api = run('api', path.join(root, 'server'), tsx, ['src/index.ts'], {
  PORT: API_PORT,
  NODE_ENV: 'production',
});

// Give API a moment to bind
setTimeout(() => {
  const nextBin = path.join(root, 'gui', 'node_modules', 'next', 'dist', 'bin', 'next');
  const nextBinRoot = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const next = fs.existsSync(nextBin) ? nextBin : nextBinRoot;
  run('gui', path.join(root, 'gui'), process.execPath, [next, 'start', '-p', GUI_PORT], {
    PORT: GUI_PORT,
    NODE_ENV: 'production',
    API_INTERNAL_URL: process.env.API_INTERNAL_URL || `http://127.0.0.1:${API_PORT}`,
  });
}, 2500);

const shutdown = () => {
  try { api.kill('SIGTERM'); } catch {}
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
