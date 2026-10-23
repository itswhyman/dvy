import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import routes from './routes/index.js';
import { initSocket } from './services/socket.js';
import { logEvent, logHttp } from './services/loggerService.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4000);
const isProd = process.env.NODE_ENV === 'production';
/** CLIENT_ORIGIN=https://www.dovye.com.tr,https://dovye.com.tr */
function resolveOrigins() {
    const raw = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const list = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (list.length === 0)
        return true;
    if (list.length === 1)
        return list[0];
    return list;
}
const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin: resolveOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Stripe webhook — raw body, json parser'dan ÖNCE
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    req.rawBody = req.body;
    next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    const started = Date.now();
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined;
    res.on('finish', () => {
        if (req.path === '/health' && res.statusCode === 200)
            return;
        logHttp({
            method: req.method,
            path: req.originalUrl || req.path,
            statusCode: res.statusCode,
            ip,
            durationMs: Date.now() - started,
        });
    });
    next();
});
app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        service: 'best-workspace-api',
        ts: new Date().toISOString(),
    });
});
// ═══════════════════════════════════════════════════════════
// API ROUTES — /api prefix ZORUNLU ve catch-all'dan ÖNCE
// POST /api/auth/login  →  router.post('/auth/login', ...)
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════
app.use('/api', routes);
// Eşleşmeyen /api/* → JSON 404 (asla HTML dönmez)
app.use('/api', (req, res) => {
    logEvent({
        level: 'warn',
        category: 'http',
        message: `API route not found: ${req.method} ${req.originalUrl}`,
        statusCode: 404,
        method: req.method,
        path: req.originalUrl,
    });
    res.status(404).json({
        success: false,
        error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
});
// Static (opsiyonel Next export / public)
const staticCandidates = [
    process.env.GUI_STATIC_DIR,
    path.resolve(__dirname, '../../gui/public'),
    path.resolve(__dirname, '../../gui/out'),
].filter(Boolean);
for (const dir of staticCandidates) {
    if (fs.existsSync(dir)) {
        app.use(express.static(dir, { index: false, maxAge: isProd ? '1d' : 0 }));
        logEvent({
            level: 'info',
            category: 'system',
            message: `Static files served from ${dir}`,
        });
    }
}
// Catch-all SADECE GET — /api asla buraya düşmez
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api'))
        return next();
    for (const dir of staticCandidates) {
        const indexHtml = path.join(dir, 'index.html');
        if (fs.existsSync(indexHtml)) {
            return res.sendFile(indexHtml);
        }
    }
    const frontendUrl = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
        .split(',')[0]
        .trim()
        .replace(/\/$/, '');
    res.status(404).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>BEST API — 404</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100svh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: #0a0d14; color: #eef0f8;
    }
    .card {
      max-width: 420px; padding: 32px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,.08); background: rgba(18,22,33,.85);
      text-align: center;
    }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    p { margin: 0 0 20px; color: #8b92a8; line-height: 1.5; }
    a {
      display: inline-block; padding: 12px 22px; border-radius: 999px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff;
      font-weight: 700; text-decoration: none;
    }
    code { font-size: .85em; color: #22d3ee; }
  </style>
</head>
<body>
  <div class="card">
    <h1>API root — no page here</h1>
    <p>
      This is the Express API (<code>:${PORT}</code>).<br/>
      UI lives at <strong>${frontendUrl}</strong>
    </p>
    <a href="${frontendUrl}">Open Workspace</a>
  </div>
</body>
</html>`);
});
// Global error handler
app.use((err, req, res, _next) => {
    logEvent({
        level: 'error',
        category: 'api',
        message: err.message || 'Unhandled error',
        statusCode: 500,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            undefined,
        meta: { stack: err.stack?.split('\n').slice(0, 4) },
    });
    console.error('[unhandled]', err.message);
    if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});
initSocket(server);
server.listen(PORT, () => {
    console.log(`BEST API listening on :${PORT}`);
    console.log(`  POST /api/auth/login`);
    console.log(`  POST /api/auth/register`);
    logEvent({
        level: 'info',
        category: 'system',
        message: `API started on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`,
    });
});
