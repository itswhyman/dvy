'use client';

import { useTheme } from '@/lib/theme';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggle}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className={styles.icon} aria-hidden>
        {isDark ? '☀' : '☾'}
      </span>
      <span className={styles.label}>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
