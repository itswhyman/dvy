'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/common/ThemeToggle';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/todos', label: 'Todos', icon: '☑' },
  { href: '/notes', label: 'Notes', icon: '✎' },
  { href: '/boards', label: 'Boards', icon: '◫' },
  { href: '/feed', label: 'Feed', icon: '◎' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/teams', label: 'Teams', icon: '◈' },
  { href: '/billing', label: 'Billing', icon: '◇' },
  { href: '/profile', label: 'Profile', icon: '○' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.logo}>BEST</span>
        <span className={styles.tag}>Workspace</span>
      </div>

      <nav className={styles.nav} aria-label="Main">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${active ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className={`${styles.link} ${pathname.startsWith('/admin') ? styles.active : ''}`}
          >
            <span className={styles.icon}>⚡</span>
            Admin
          </Link>
        )}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle />
        <div className={styles.user}>
          <div className={styles.avatar}>
            {(user?.name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.meta}>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <button type="button" className={styles.logout} onClick={logout} title="Sign out">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
