'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/lib/api';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [banner, setBanner] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    api<Record<string, string>>('/settings/public').then((res) => {
      if (res.data?.announcement_banner) setBanner(res.data.announcement_banner);
    });
  }, []);

  if (loading || !user) {
    return (
      <div className={styles.loading}>
        <span className={styles.pulse}>Loading…</span>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        {banner && <div className={styles.banner}>{banner}</div>}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
