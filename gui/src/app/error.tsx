'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './error.module.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BEST error boundary]', error);
  }, [error]);

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.badge}>500 · Runtime Error</span>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.desc}>
          An unexpected error was caught by the App Router error boundary.
          You can retry the action or return to the dashboard.
        </p>

        <div className={styles.digestBox}>
          <span className={styles.digestLabel}>Error digest</span>
          <code className={styles.digestValue}>
            {error.digest || 'no-digest'}
          </code>
          {error.message ? (
            <p className={styles.errorMsg}>{error.message}</p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => reset()}>
            Retry
          </button>
          <Link href="/todos" className={styles.ghost}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
