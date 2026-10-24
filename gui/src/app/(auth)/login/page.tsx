'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from '../auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await login(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Giriş başarısız');
      return;
    }
    router.push('/feed');
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand}>BEST</Link>
        <h1 className={styles.title}>Tekrar hoş geldin</h1>
        <p className={styles.lead}>Workspace&apos;ine giriş yap</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>E-posta</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Şifre</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>
        <p className={styles.footer}>
          Hesabın yok mu? <Link href="/register">Hemen oluştur</Link>
        </p>
        <p className={styles.hint}>Demo: maya@best.app · Password123!</p>
        <Link href="/" className={styles.backHome}>← Ana sayfaya dön</Link>
      </div>
    </div>
  );
}
