'use client';

import { useTheme } from '@/lib/theme';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <span className={styles.track} data-theme={theme}>
        <span className={styles.thumb}>{theme === 'dark' ? '☾' : '☀'}</span>
      </span>
    </button>
  );
}
