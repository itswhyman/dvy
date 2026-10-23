import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
declare global {
    var __bestPool: Pool | undefined;
}
export declare const pool: Pool;
export declare function safeQuery<T>(fn: () => Promise<T>, fallback: T, label?: string): Promise<T>;
export declare function queryRows<T extends RowDataPacket[]>(sql: string, params?: any[], label?: string): Promise<T>;
export declare function execute(sql: string, params?: any[], label?: string): Promise<ResultSetHeader | null>;
export declare function parseJson<T>(v: unknown, fallback: T): T;
