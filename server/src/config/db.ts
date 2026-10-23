import mysql, {
  Pool,
  PoolOptions,
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __bestPool: Pool | undefined;
}

function createPool(): Pool {
  const config: PoolOptions = {
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

export const pool: Pool = globalThis.__bestPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__bestPool = pool;
}

export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  label = 'db'
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}]`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function queryRows<T extends RowDataPacket[]>(
  sql: string,
  params: any[] = [],
  label = 'query'
): Promise<T> {
  return safeQuery(
    async () => {
      const [rows] = await pool.query<T>(sql, params);
      return rows;
    },
    [] as unknown as T,
    label
  );
}

export async function execute(
  sql: string,
  params: any[] = [],
  label = 'execute'
): Promise<ResultSetHeader | null> {
  return safeQuery(
    async () => {
      const [result] = await pool.execute<ResultSetHeader>(sql, params);
      return result;
    },
    null,
    label
  );
}

export function parseJson<T>(v: unknown, fallback: T): T {
  try {
    if (v == null) return fallback;
    return (typeof v === 'string' ? JSON.parse(v) : v) as T;
  } catch {
    return fallback;
  }
}
