import mysql from 'mysql2/promise';
function createPool() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME || 'best_workspace',
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10_000,
        connectTimeout: 8_000,
        idleTimeout: 60_000,
        decimalNumbers: true,
    };
    return mysql.createPool(config);
}
export const pool = globalThis.__bestPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
    globalThis.__bestPool = pool;
}
export async function safeQuery(fn, fallback, label = 'db') {
    try {
        return await fn();
    }
    catch (err) {
        console.error(`[${label}]`, err instanceof Error ? err.message : err);
        return fallback;
    }
}
export async function queryRows(sql, params = [], label = 'query') {
    return safeQuery(async () => {
        const [rows] = await pool.query(sql, params);
        return rows;
    }, [], label);
}
export async function execute(sql, params = [], label = 'execute') {
    return safeQuery(async () => {
        const [result] = await pool.execute(sql, params);
        return result;
    }, null, label);
}
export function parseJson(v, fallback) {
    try {
        if (v == null)
            return fallback;
        return (typeof v === 'string' ? JSON.parse(v) : v);
    }
    catch {
        return fallback;
    }
}
