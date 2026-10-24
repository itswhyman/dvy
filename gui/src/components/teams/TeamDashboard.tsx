'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Team } from '@/types';
import styles from './TeamDashboard.module.css';

interface Analytics {
  todos_by_status: Record<string, number>;
  teams: { id: number; name: string; score: number; metrics: Record<string, number> }[];
  total_users: number;
}

export default function TeamDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    const [t, a] = await Promise.all([
      api<Team[]>('/teams'),
      api<Analytics>('/analytics'),
    ]);
    setTeams(t.data ?? []);
    setAnalytics(a.data ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxScore = Math.max(
    1,
    ...teams.map((t) => Number(t.performance_score ?? 0)),
    100
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Team Performance</h1>
        <p className={styles.sub}>Scores · velocity · completion rates</p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Users</span>
          <strong className={styles.statVal}>{analytics?.total_users ?? '—'}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Pending</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.pending ?? 0}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>In progress</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.in_progress ?? 0}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Completed</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.completed ?? 0}
          </strong>
        </div>
      </div>

      <div className={styles.grid}>
        {teams.map((t) => {
          const m = t.metrics_json || {};
          const score = Number(t.performance_score ?? 0);
          const pct = Math.round((score / maxScore) * 100);
          const label = t.team_name || t.name || `Team #${t.id}`;
          return (
            <article key={t.id} className={styles.card}>
              <div className={styles.cardHead}>
                <h2>{label}</h2>
                <span className={styles.score}>{score.toFixed(1)}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
              <dl className={styles.metrics}>
                <div>
                  <dt>Completed / week</dt>
                  <dd>{m.completed_week ?? 0}</dd>
                </div>
                <div>
                  <dt>WIP</dt>
                  <dd>{m.wip ?? 0}</dd>
                </div>
                <div>
                  <dt>Velocity</dt>
                  <dd>{m.velocity ?? 0}</dd>
                </div>
              </dl>
            </article>
          );
        })}
        {!teams.length && <p className={styles.empty}>No teams yet.</p>}
      </div>
    </div>
  );
}
