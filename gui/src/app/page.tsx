'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

const FEATURES = [
  { title: 'AI Destekli Todos', desc: 'Akıllı öncelik, yıldız rating, alt görevler ve odak modları.', icon: '✓' },
  { title: 'Anlık Mesajlaşma', desc: 'Presence, yazıyor göstergesi ve anlık teslimat.', icon: '💬' },
  { title: 'Yazım Tahtası', desc: 'Şekil, ok ve metin ile görsel planlama tahtaları.', icon: '▦' },
  { title: 'Notlar & Bilgi', desc: 'Şablonlu notlar, AI özet ve PDF dışa aktarma.', icon: '✎' },
  { title: 'Ekipler & Roller', desc: 'Sabit üye renkleri, performans ve izinler.', icon: '◎' },
  { title: 'Ödeme Hazır', desc: 'Stripe ile Free’den Enterprise’a planlar.', icon: '◆' },
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
            <a href="#features">Özellikler</a>
            <a href="#pricing">Fiyatlar</a>
            <button type="button" className={styles.navGhost} onClick={() => goProtected('/feed')}>
              Panel
            </button>
            {user ? (
              <Link href="/feed" className={styles.navCta}>Çalışma alanını aç</Link>
            ) : (
              <>
                <Link href="/login" className={styles.navGhost}>Giriş</Link>
                <Link href="/register" className={styles.navCta}>Başla</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>Ultimate Workspace · Üretkenlik Ekosistemi</div>
        <h1 className={styles.heroTitle}>
          Planla, işbirliği yap &
          <br />
          <span className={styles.gradientText}>daha hızlı bitir</span>
        </h1>
        <p className={styles.heroLead}>
          AI öncelik, anlık mesaj, tahta, not ve ekipler — modern ekipler için tek premium
          çalışma alanı.
        </p>
        <div className={styles.heroActions}>
          {user ? (
            <Link href="/feed" className={styles.btnPrimary}>Panele git</Link>
          ) : (
            <>
              <Link href="/register" className={styles.btnPrimary}>Ücretsiz başla</Link>
              <Link href="/login" className={styles.btnGhost}>Giriş yap</Link>
            </>
          )}
          <button type="button" className={styles.btnGhost} onClick={() => goProtected('/boards')}>
            Proje oluştur
          </button>
        </div>
        <div className={styles.heroGlow} aria-hidden />
      </section>

      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Hepsi bir arada</h2>
        <p className={styles.sectionLead}>
          Günlük todolardan kurumsal ekiplere — tutarlı tasarım dili ve gerçek zamanlı altyapı.
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
          <h2 className={styles.sectionTitle}>Sade planlar</h2>
          <p className={styles.sectionLead}>
            Keşfetmek için Free. Güç kullanıcıları için Pro. Kontrol isteyen ekipler için Enterprise.
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
              <span className={styles.planPrice}>Özel</span>
            </div>
          </div>
          <Link href={user ? '/billing' : '/register'} className={styles.btnPrimary}>
            {user ? 'Faturalamayı yönet' : 'Plan seç'}
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.logoText}>BEST Workspace</span>
          <div className={styles.footerLinks}>
            <Link href="/login">Giriş</Link>
            <Link href="/register">Kayıt</Link>
            <a href="#features">Özellikler</a>
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
