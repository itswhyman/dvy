'use client';

import styles from './global-error.module.css';

/**
 * Root layout fallback — must include its own <html> and <body>
 * because the root layout failed to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={styles.shell}>
        <div className={styles.card}>
          <span className={styles.badge}>Critical · Global Error</span>
          <h1 className={styles.title}>Workspace failed to load</h1>
          <p className={styles.desc}>
            A root-level error prevented the app shell from rendering.
            Try again or reload the page.
          </p>
          <code className={styles.digest}>{error.digest || error.message || 'unknown'}</code>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => reset()}>
              Try again
            </button>
            <a href="/" className={styles.ghost}>
              Reload home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
