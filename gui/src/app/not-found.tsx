import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.shell}>
      <div className={styles.glitchLayer} aria-hidden />
      <div className={styles.card}>
        <div className={styles.code} aria-hidden>
          404
        </div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.desc}>
          This route doesn&apos;t exist in BEST Workspace — or it moved.
          Head back to safety.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Ana Sayfaya Dön
          </Link>
          <Link href="/todos" className={styles.ghost}>
            Dashboard&apos;a Git
          </Link>
        </div>
      </div>
    </div>
  );
}
