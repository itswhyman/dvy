'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await register(name, email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Kayıt başarısız');
      return;
    }
    router.push('/todos');
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand}>BEST</Link>
        <h1 className={styles.title}>Hesap oluştur</h1>
        <p className={styles.lead}>Ultimate workspace&apos;e katıl</p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Ad</span>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adın"
              required
              minLength={2}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>E-posta</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              placeholder="En az 8 karakter"
              required
              minLength={8}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Oluşturuluyor…' : 'Hesap oluştur'}
          </button>
        </form>
        <p className={styles.footer}>
          Zaten hesabın var mı? <Link href="/login">Giriş yap</Link>
        </p>
        <Link href="/" className={styles.backHome}>← Ana sayfaya dön</Link>
      </div>
    </div>
  );
}
