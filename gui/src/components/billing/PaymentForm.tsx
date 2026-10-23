'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import styles from './PaymentForm.module.css';

interface Sub {
  plan_type: string;
  status: string;
  current_period_end: string | null;
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    features: ['50 todos', '3 boards', 'Basic chat'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$19/mo',
    features: ['Unlimited todos', 'AI scoring', 'Unlimited boards', 'Priority support'],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$79/mo',
    features: ['Everything in Pro', 'Admin controls', 'SSO ready', 'Dedicated support'],
  },
];

export default function PaymentForm() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<Sub>('/billing/subscription');
    if (res.data) setSub(res.data);
  }, []);

  useEffect(() => {
    void load();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success')) setMsg('Subscription activated successfully.');
      if (params.get('canceled')) setMsg('Checkout canceled.');
    }
  }, [load]);

  async function checkout(plan: 'pro' | 'enterprise') {
    setBusy(plan);
    setMsg('');
    const res = await api<{ url?: string; mode?: string; message?: string; plan_type?: string }>(
      '/billing/checkout',
      { method: 'POST', body: JSON.stringify({ plan }) }
    );
    setBusy(null);
    if (res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    if (res.data?.mode === 'dev') {
      setMsg(res.data.message || 'Plan activated (dev mode).');
      void load();
    } else if (res.error) {
      setMsg(res.error);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Billing</h1>
        <p className={styles.sub}>
          Current plan:{' '}
          <strong className={styles.planTag}>{sub?.plan_type ?? 'free'}</strong>
          {sub?.current_period_end && (
            <span className={styles.period}>
              · renews {new Date(sub.current_period_end).toLocaleDateString()}
            </span>
          )}
        </p>
      </header>

      {msg && <p className={styles.msg}>{msg}</p>}

      <div className={styles.grid}>
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`${styles.card} ${sub?.plan_type === p.id ? styles.current : ''}`}
          >
            <h2>{p.name}</h2>
            <div className={styles.price}>{p.price}</div>
            <ul className={styles.features}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {p.id === 'free' ? (
              <span className={styles.badge}>Included</span>
            ) : (
              <button
                type="button"
                className={styles.cta}
                disabled={busy === p.id || sub?.plan_type === p.id}
                onClick={() => checkout(p.id)}
              >
                {sub?.plan_type === p.id
                  ? 'Current plan'
                  : busy === p.id
                    ? 'Processing…'
                    : 'Upgrade'}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
