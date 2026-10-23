/**
 * In-memory ring-buffer system logger.
 * Captures 404 / 500 / DB / API / Socket events for the Admin Logs panel.
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory = 'http' | 'api' | 'db' | 'socket' | 'auth' | 'system' | 'billing';
export interface SystemLog {
    id: string;
    ts: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    statusCode?: number;
    method?: string;
    path?: string;
    ip?: string;
    userId?: number | null;
    meta?: Record<string, unknown>;
}
export declare function logEvent(input: {
    level?: LogLevel;
    category?: LogCategory;
    message: string;
    statusCode?: number;
    method?: string;
    path?: string;
    ip?: string;
    userId?: number | null;
    meta?: Record<string, unknown>;
}): SystemLog;
export declare function logHttp(opts: {
    method: string;
    path: string;
    statusCode: number;
    ip?: string;
    userId?: number | null;
    durationMs?: number;
    message?: string;
}): void;
export declare function logDb(message: string, meta?: Record<string, unknown>): void;
export declare function logSocket(message: string, meta?: Record<string, unknown>): void;
export declare function listLogs(filters: {
    level?: LogLevel;
    category?: LogCategory;
    statusCode?: number;
    q?: string;
    limit?: number;
    offset?: number;
}): {
    total: number;
    items: SystemLog[];
};
export declare function clearLogs(): number;
export declare function getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    recentErrors: number;
};
