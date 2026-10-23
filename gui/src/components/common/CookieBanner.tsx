'use client';

import { useEffect, useState } from 'react';
import styles from './CookieBanner.module.css';

const STORAGE_KEY = 'best_cookie_consent';
type Consent = 'accepted' | 'declined' | null;

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent;
      if (stored === 'accepted' || stored === 'declined') setConsent(stored);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  function save(value: 'accepted' | 'declined') {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
    setConsent(value);
    setShowDetails(false);
  }

  if (!ready || consent) return null;

  return (
    <>
      <div className={styles.banner} role="dialog" aria-label="Çerez ve KVKK onayı">
        <div className={styles.inner}>
          <div className={styles.text}>
            <strong className={styles.title}>Çerezler & KVKK</strong>
            <p className={styles.desc}>
              Deneyimi iyileştirmek için zorunlu ve analitik çerezler kullanıyoruz. Devam ederek
              KVKK Aydınlatma Metni&apos;ni kabul etmiş olursunuz.
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.detailsBtn} onClick={() => setShowDetails(true)}>
              Detaylar
            </button>
            <button type="button" className={styles.decline} onClick={() => save('declined')}>
              Reddet
            </button>
            <button type="button" className={styles.accept} onClick={() => save('accepted')}>
              Kabul et
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Çerez & KVKK Bilgilendirmesi</h3>
            <div className={styles.modalBody}>
              <p>
                <strong>Zorunlu çerezler:</strong> Oturum, güvenlik ve tercihler için gereklidir.
                Bunlar olmadan temel işlevler çalışmaz.
              </p>
              <p>
                <strong>Analitik:</strong> Kullanım istatistikleri (anonim) ürün iyileştirmesi için
                toplanabilir. Reddederseniz yalnızca zorunlu çerezler aktif kalır.
              </p>
              <p>
                Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir. Tercihinizi istediğiniz
                zaman tarayıcı depolamasından silebilirsiniz.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.decline} onClick={() => save('declined')}>
                Reddet
              </button>
              <button type="button" className={styles.accept} onClick={() => save('accepted')}>
                Kabul et
              </button>
              <button type="button" className={styles.detailsBtn} onClick={() => setShowDetails(false)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
