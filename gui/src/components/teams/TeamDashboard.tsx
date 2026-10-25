'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Team, TeamMember } from '@/types';
import styles from './TeamDashboard.module.css';

interface Analytics {
  todos_by_status: Record<string, number>;
  teams: { id: number; name: string; score: number; metrics: Record<string, number> }[];
  total_users: number;
}

type TeamDetail = Team & { members?: TeamMember[] };

export default function TeamDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selected, setSelected] = useState<TeamDetail | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function openTeam(id: number) {
    const res = await api<TeamDetail>(`/teams/${id}`);
    if (res.success && res.data) setSelected(res.data);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await api<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
    });
    setBusy(false);
    if (res.success && res.data) {
      setTeams((prev) => [res.data!, ...prev]);
      setName('');
      setDesc('');
      void openTeam(res.data.id);
    }
  }

  const maxScore = Math.max(
    1,
    ...(analytics?.teams || []).map((t) => Number(t.score ?? 0)),
    ...teams.map((t) => Number(t.performance_score ?? 0)),
    100
  );

  const scoreFor = (t: Team) => {
    const fromAnalytics = analytics?.teams?.find((x) => x.id === t.id)?.score;
    return Number(fromAnalytics ?? t.performance_score ?? 0);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Ekipler</h1>
          <p className={styles.sub}>
            Üye renkleri · performans · tamamlama oranları
          </p>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Kullanıcı</span>
          <strong className={styles.statVal}>{analytics?.total_users ?? '—'}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Bekleyen</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.pending ?? 0}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Devam</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.in_progress ?? 0}
          </strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Bitti</span>
          <strong className={styles.statVal}>
            {analytics?.todos_by_status?.completed ?? 0}
          </strong>
        </div>
      </div>

      <form className={styles.create} onSubmit={onCreate}>
        <input
          className={styles.input}
          placeholder="Ekip adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
        />
        <input
          className={styles.input}
          placeholder="Açıklama (opsiyonel)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button className={styles.createBtn} type="submit" disabled={busy || !name.trim()}>
          Ekip oluştur
        </button>
      </form>

      <div className={styles.main}>
        <div className={styles.grid}>
          {teams.map((t) => {
            const score = scoreFor(t);
            const pct = Math.round((score / maxScore) * 100);
            const label = t.name || t.team_name || `Team #${t.id}`;
            return (
              <article
                key={t.id}
                className={`${styles.card} ${selected?.id === t.id ? styles.cardOn : ''}`}
                onClick={() => void openTeam(t.id)}
              >
                <div className={styles.cardHead}>
                  <h2>{label}</h2>
                  <span className={styles.score}>{score.toFixed(1)}</span>
                </div>
                {t.description && <p className={styles.desc}>{t.description}</p>}
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
                <dl className={styles.metrics}>
                  <div>
                    <dt>WIP</dt>
                    <dd>{t.metrics_json?.wip ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Haftalık</dt>
                    <dd>{t.metrics_json?.completed_week ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Hız</dt>
                    <dd>{t.metrics_json?.velocity ?? score}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
          {!teams.length && (
            <p className={styles.empty}>Henüz ekip yok — yukarıdan oluştur.</p>
          )}
        </div>

        {selected && (
          <aside className={styles.detail}>
            <h3 className={styles.detailTitle}>
              {selected.name || selected.team_name}
            </h3>
            {selected.description && (
              <p className={styles.desc}>{selected.description}</p>
            )}
            <p className={styles.memberLabel}>Üyeler (renk sabit)</p>
            <ul className={styles.members}>
              {(selected.members || []).map((m) => (
                <li key={m.user_id} className={styles.member}>
                  <span
                    className={styles.colorDot}
                    style={{ background: m.member_color || '#888' }}
                  />
                  <div>
                    <strong>{m.name || `User #${m.user_id}`}</strong>
                    <span className={styles.role}>{m.role || 'member'}</span>
                  </div>
                  <code className={styles.hex}>{m.member_color}</code>
                </li>
              ))}
              {!(selected.members || []).length && (
                <li className={styles.empty}>Üye listesi boş</li>
              )}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
