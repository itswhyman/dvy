/**
 * In-memory ring-buffer system logger.
 * Captures 404 / 500 / DB / API / Socket events for the Admin Logs panel.
 */
const MAX_LOGS = 2000;
const store = [];
let seq = 0;
function nextId() {
    seq += 1;
    return `L${Date.now().toString(36)}-${seq.toString(36)}`;
}
export function logEvent(input) {
    const entry = {
        id: nextId(),
        ts: new Date().toISOString(),
        level: input.level ?? 'info',
        category: input.category ?? 'system',
        message: input.message,
        statusCode: input.statusCode,
        method: input.method,
        path: input.path,
        ip: input.ip,
        userId: input.userId ?? null,
        meta: input.meta,
    };
    store.push(entry);
    if (store.length > MAX_LOGS) {
        store.splice(0, store.length - MAX_LOGS);
    }
    // Mirror critical errors to console
    if (entry.level === 'error') {
        console.error(`[log] ${entry.category} ${entry.statusCode ?? ''} ${entry.method ?? ''} ${entry.path ?? ''} — ${entry.message}`);
    }
    return entry;
}
export function logHttp(opts) {
    const isError = opts.statusCode >= 500;
    const isWarn = opts.statusCode >= 400;
    logEvent({
        level: isError ? 'error' : isWarn ? 'warn' : 'info',
        category: 'http',
        message: opts.message ??
            `${opts.method} ${opts.path} → ${opts.statusCode}${opts.durationMs != null ? ` (${opts.durationMs}ms)` : ''}`,
        statusCode: opts.statusCode,
        method: opts.method,
        path: opts.path,
        ip: opts.ip,
        userId: opts.userId,
        meta: opts.durationMs != null ? { durationMs: opts.durationMs } : undefined,
    });
}
export function logDb(message, meta) {
    logEvent({ level: 'error', category: 'db', message, meta });
}
export function logSocket(message, meta) {
    logEvent({ level: 'info', category: 'socket', message, meta });
}
export function listLogs(filters) {
    let items = [...store].reverse(); // newest first
    if (filters.level) {
        items = items.filter((l) => l.level === filters.level);
    }
    if (filters.category) {
        items = items.filter((l) => l.category === filters.category);
    }
    if (filters.statusCode != null) {
        items = items.filter((l) => l.statusCode === filters.statusCode);
    }
    if (filters.q) {
        const q = filters.q.toLowerCase();
        items = items.filter((l) => l.message.toLowerCase().includes(q) ||
            (l.path ?? '').toLowerCase().includes(q) ||
            (l.ip ?? '').includes(q) ||
            l.id.toLowerCase().includes(q));
    }
    const total = items.length;
    const offset = Math.max(0, filters.offset ?? 0);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 100));
    items = items.slice(offset, offset + limit);
    return { total, items };
}
export function clearLogs() {
    const n = store.length;
    store.length = 0;
    seq = 0;
    return n;
}
export function getLogStats() {
    const byLevel = {};
    const byCategory = {};
    let recentErrors = 0;
    const cutoff = Date.now() - 60 * 60 * 1000; // last hour
    for (const l of store) {
        byLevel[l.level] = (byLevel[l.level] ?? 0) + 1;
        byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
        if (l.level === 'error' && new Date(l.ts).getTime() >= cutoff) {
            recentErrors += 1;
        }
    }
    return { total: store.length, byLevel, byCategory, recentErrors };
}
