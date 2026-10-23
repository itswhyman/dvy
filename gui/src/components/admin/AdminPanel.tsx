'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { User } from '@/types';
import styles from './AdminPanel.module.css';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [u, s, st] = await Promise.all([
      api<User[]>('/admin/users'),
      api<Record<string, number>>('/admin/stats'),
      api<Record<string, string>>('/admin/settings'),
    ]);
    setUsers(u.data ?? []);
    setStats(s.data ?? {});
    const sett = st.data ?? {};
    setSettings(sett);
    setBanner(sett.announcement_banner || '');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRole(id: number, role: string) {
    await api(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    void load();
  }

  async function removeUser(id: number) {
    if (!confirm('Delete this user?')) return;
    await api(`/admin/users/${id}`, { method: 'DELETE' });
    void load();
  }

  async function saveBanner(e: FormEvent) {
    e.preventDefault();
    await api('/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'announcement_banner', value: banner }),
    });
    setMsg('Banner updated.');
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Admin Control Center</h1>
          <p className={styles.sub}>Users · settings · system stats</p>
        </div>
        <Link href="/admin/logs" className={styles.saveBtn} style={{ textDecoration: 'none' }}>
          System Logs →
        </Link>
      </header>

      <div className={styles.stats}>
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className={styles.stat}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <form className={styles.bannerForm} onSubmit={saveBanner}>
        <label className={styles.field}>
          <span>Announcement banner</span>
          <input
            className={styles.input}
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.saveBtn}>
          Save banner
        </button>
        {msg && <span className={styles.msg}>{msg}</span>}
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className={styles.select}
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="pro_user">pro_user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{u.status}</td>
                <td>
                  <button
                    type="button"
                    className={styles.del}
                    onClick={() => removeUser(u.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
