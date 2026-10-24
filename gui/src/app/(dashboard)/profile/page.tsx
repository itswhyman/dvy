'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, authApi } from '@/lib/api';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [msg, setMsg] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await authApi.updateProfile({
      name,
      bio,
      avatar_url: avatarUrl || undefined,
    });
    if (res.success) {
      setMsg('Profile updated.');
      await refresh();
    } else {
      setMsg(res.error || 'Update failed');
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    const res = await api('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.success) {
      setPwdMsg('Password changed.');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setPwdMsg(res.error || 'Password change failed');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Profile & Settings</h1>
          <p className={styles.sub}>
            {user?.email} · {user?.role}
          </p>
        </div>
        <Link href="/billing" className={styles.billingLink}>
          Billing & Plans →
        </Link>
      </header>

      <div className={styles.grid}>
        <form className={styles.form} onSubmit={save}>
          <h2 className={styles.section}>Public profile</h2>
          <label className={styles.field}>
            <span>Name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Avatar URL</span>
            <input
              className={styles.input}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className={styles.field}>
            <span>Bio</span>
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </label>
          {msg && <p className={styles.msg}>{msg}</p>}
          <button type="submit" className={styles.save}>
            Save profile
          </button>
        </form>

        <form className={styles.form} onSubmit={changePassword}>
          <h2 className={styles.section}>Security</h2>
          <label className={styles.field}>
            <span>Current password</span>
            <input
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className={styles.field}>
            <span>New password</span>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </label>
          {pwdMsg && <p className={styles.msg}>{pwdMsg}</p>}
          <button type="submit" className={styles.save}>
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}
