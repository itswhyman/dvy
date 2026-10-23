'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [msg, setMsg] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    const res = await authApi.updateProfile({ name, bio });
    if (res.success) {
      setMsg('Profile updated.');
      await refresh();
    } else {
      setMsg(res.error || 'Update failed');
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Profile</h1>
      <p className={styles.sub}>{user?.email} · {user?.role}</p>

      <form className={styles.form} onSubmit={save}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
    </div>
  );
}
