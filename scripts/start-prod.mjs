/**
 * Production starter for Coolify / single-container deploys.
 * Starts Express API (:4000 or PORT_API) and Next.js GUI (:3000 or PORT).
 * Public traffic should hit the GUI port; Next rewrites /api and /socket.io to the API.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const API_PORT = process.env.PORT_API || process.env.API_PORT || '4000';
// Coolify / most PaaS inject PORT for the public service — use it for Next.js
const GUI_PORT = process.env.PORT || process.env.GUI_PORT || '3000';

function run(name, cwd, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    console.error(`[${name}] exited code=${code} signal=${signal}`);
    // If either process dies, tear down the other
    process.exit(code ?? 1);
  });

  child.on('error', (err) => {
    console.error(`[${name}] failed to start:`, err);
    process.exit(1);
  });

  return child;
}

console.log(`[start-prod] API → :${API_PORT}  |  GUI → :${GUI_PORT}`);
console.log(`[start-prod] API_INTERNAL_URL should point to http://127.0.0.1:${API_PORT}`);

// 1) Express API
const api = run(
  'server',
  path.join(root, 'server'),
  'node',
  ['dist/index.js'],
  {
    PORT: API_PORT,
    NODE_ENV: 'production',
  }
);

// 2) Next.js (waits a moment so API is up for health)
setTimeout(() => {
  run(
    'gui',
    path.join(root, 'gui'),
    'node',
    ['node_modules/next/dist/bin/next', 'start', '-p', String(GUI_PORT)],
    {
      PORT: GUI_PORT,
      NODE_ENV: 'production',
      // Ensure rewrites target the co-located API
      API_INTERNAL_URL: process.env.API_INTERNAL_URL || `http://127.0.0.1:${API_PORT}`,
    }
  );
}, 1500);

// Keep alive; children inherit stdio
process.on('SIGTERM', () => {
  api.kill('SIGTERM');
  process.exit(0);
});
process.on('SIGINT', () => {
  api.kill('SIGINT');
  process.exit(0);
});
