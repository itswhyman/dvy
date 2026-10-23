'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import styles from './SystemLogs.module.css';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'http' | 'api' | 'db' | 'socket' | 'auth' | 'system' | 'billing';

interface SystemLog {
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
}

interface LogsPayload {
  total: number;
  items: SystemLog[];
  stats: {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    recentErrors: number;
  };
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  error: styles.levelError,
  warn: styles.levelWarn,
  info: styles.levelInfo,
  debug: styles.levelDebug,
};

export default function SystemLogs() {
  const [data, setData] = useState<LogsPayload | null>(null);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (category) params.set('category', category);
    if (statusCode) params.set('statusCode', statusCode);
    if (q.trim()) params.set('q', q.trim());
    params.set('limit', '150');

    const res = await api<LogsPayload>(`/admin/logs?${params.toString()}`);
    setData(res.data ?? null);
    setLoading(false);
  }, [level, category, statusCode, q]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  async function clearAll() {
    if (!confirm('Clear all in-memory system logs?')) return;
    await api('/admin/logs', { method: 'DELETE' });
    void load();
  }

  const stats = data?.stats;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>System Logs</h1>
          <p className={styles.sub}>
            Live HTTP · API · DB · Socket events (in-memory ring buffer)
          </p>
        </div>
        <div>
          <button type="button" className={styles.btnGhost} onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>{' '}
          <button type="button" className={styles.btnDanger} onClick={() => void clearAll()}>
            Clear
          </button>
        </div>
      </header>

      {stats ? (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total</span>
            <strong className={styles.statValue}>{stats.total}</strong>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Errors (1h)</span>
            <strong className={styles.statValue}>{stats.recentErrors}</strong>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Warn</span>
            <strong className={styles.statValue}>{stats.byLevel.warn ?? 0}</strong>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>HTTP</span>
            <strong className={styles.statValue}>{stats.byCategory.http ?? 0}</strong>
          </div>
        </div>
      ) : null}

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          aria-label="Level"
        >
          <option value="">All levels</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
          <option value="debug">debug</option>
        </select>
        <select
          className={styles.select}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          <option value="http">http</option>
          <option value="api">api</option>
          <option value="db">db</option>
          <option value="socket">socket</option>
          <option value="auth">auth</option>
          <option value="system">system</option>
          <option value="billing">billing</option>
        </select>
        <select
          className={styles.select}
          value={statusCode}
          onChange={(e) => setStatusCode(e.target.value)}
          aria-label="Status"
        >
          <option value="">Any status</option>
          <option value="404">404</option>
          <option value="401">401</option>
          <option value="403">403</option>
          <option value="422">422</option>
          <option value="500">500</option>
        </select>
        <input
          className={styles.input}
          placeholder="Search message / path / IP…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className={styles.btn} onClick={() => void load()}>
          Filter
        </button>
      </div>

      <div className={styles.tableWrap}>
        {!data?.items?.length ? (
          <div className={styles.empty}>No logs match the current filters.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Time</th>
                <th className={styles.th}>Level</th>
                <th className={styles.th}>Cat</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Method</th>
                <th className={styles.th}>Path</th>
                <th className={styles.th}>IP</th>
                <th className={styles.th}>Message</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <td className={`${styles.td} ${styles.mono} ${styles.meta}`}>
                    {new Date(row.ts).toLocaleString()}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.level} ${LEVEL_CLASS[row.level]}`}>
                      {row.level}
                    </span>
                  </td>
                  <td className={styles.td}>{row.category}</td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    {row.statusCode ?? '—'}
                  </td>
                  <td className={`${styles.td} ${styles.mono}`}>
                    {row.method ?? '—'}
                  </td>
                  <td className={`${styles.td} ${styles.path} ${styles.mono}`} title={row.path}>
                    {row.path ?? '—'}
                  </td>
                  <td className={`${styles.td} ${styles.mono} ${styles.meta}`}>
                    {row.ip ?? '—'}
                  </td>
                  <td className={`${styles.td} ${styles.msg}`}>{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data ? (
        <p className={styles.meta}>
          Showing {data.items.length} of {data.total} · auto-refresh 8s
        </p>
      ) : null}
    </div>
  );
}
