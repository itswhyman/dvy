'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

const FEATURES = [
  { title: 'AI-Powered Todos', desc: 'Smart task scoring, velocity tracking and weekly focus modes.', icon: '✓' },
  { title: 'Realtime Chat', desc: 'Team channels with presence, mentions and instant delivery.', icon: '💬' },
  { title: 'Visual Boards', desc: 'Kanban-style canvases for projects, sprints and creative work.', icon: '▦' },
  { title: 'Notes & Knowledge', desc: 'Rich notes with AI assist, tags and team sharing.', icon: '✎' },
  { title: 'Teams & Roles', desc: 'Performance scores, leads and fine-grained permissions.', icon: '◎' },
  { title: 'Billing Ready', desc: 'Stripe-powered plans from Free to Enterprise.', icon: '◆' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAuthHint, setShowAuthHint] = useState(false);

  function goProtected(path: string) {
    if (loading) return;
    if (user) {
      router.push(path);
      return;
    }
    setShowAuthHint(true);
  }

  return (
    <div className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>B</span>
            <span className={styles.logoText}>BEST</span>
          </Link>
          <nav className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button type="button" className={styles.navGhost} onClick={() => goProtected('/todos')}>
              Dashboard
            </button>
            {user ? (
              <Link href="/todos" className={styles.navCta}>Open Workspace</Link>
            ) : (
              <>
                <Link href="/login" className={styles.navGhost}>Sign in</Link>
                <Link href="/register" className={styles.navCta}>Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>Ultimate Workspace · Creative Ecosystem</div>
        <h1 className={styles.heroTitle}>
          Build, collaborate &
          <br />
          <span className={styles.gradientText}>ship faster</span>
        </h1>
        <p className={styles.heroLead}>
          AI scoring, realtime chat, boards, notes and teams — one premium dark workspace
          designed for modern product teams.
        </p>
        <div className={styles.heroActions}>
          {user ? (
            <Link href="/todos" className={styles.btnPrimary}>Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/register" className={styles.btnPrimary}>Start free</Link>
              <Link href="/login" className={styles.btnGhost}>Sign in</Link>
            </>
          )}
          <button type="button" className={styles.btnGhost} onClick={() => goProtected('/boards')}>
            Create project
          </button>
        </div>
        <div className={styles.heroGlow} aria-hidden />
      </section>

      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything in one place</h2>
        <p className={styles.sectionLead}>
          From daily todos to enterprise teams — a cohesive design language and realtime backbone.
        </p>
        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <article key={f.title} className={styles.card}>
              <div className={styles.cardIcon}>{f.icon}</div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.pricing}>
        <div className={styles.pricingCard}>
          <h2 className={styles.sectionTitle}>Simple plans</h2>
          <p className={styles.sectionLead}>
            Free to explore. Pro for power users. Enterprise for teams that need control.
          </p>
          <div className={styles.planRow}>
            <div className={styles.plan}>
              <span className={styles.planName}>Free</span>
              <span className={styles.planPrice}>$0</span>
            </div>
            <div className={`${styles.plan} ${styles.planHighlight}`}>
              <span className={styles.planName}>Pro</span>
              <span className={styles.planPrice}>$12</span>
            </div>
            <div className={styles.plan}>
              <span className={styles.planName}>Enterprise</span>
              <span className={styles.planPrice}>Custom</span>
            </div>
          </div>
          <Link href={user ? '/billing' : '/register'} className={styles.btnPrimary}>
            {user ? 'Manage billing' : 'Choose a plan'}
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.logoText}>BEST Workspace</span>
          <div className={styles.footerLinks}>
            <Link href="/login">Sign in</Link>
            <Link href="/register">Register</Link>
            <a href="#features">Features</a>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} BEST · All rights reserved</p>
        </div>
      </footer>

      {showAuthHint && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Sign in required</h3>
            <p className={styles.modalDesc}>
              Dashboard and protected areas need an account. Create one in seconds or sign in.
            </p>
            <div className={styles.modalActions}>
              <Link href="/register" className={styles.btnPrimary}>Create account</Link>
              <Link href="/login" className={styles.btnGhost}>Sign in</Link>
              <button type="button" className={styles.btnGhost} onClick={() => setShowAuthHint(false)}>
                Stay on landing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
