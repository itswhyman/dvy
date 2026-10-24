'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import styles from './ToastProvider.module.css';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastCtx {
  push: (t: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = seq++;
      const item: ToastItem = { id, durationMs: 3800, ...t };
      setItems((prev) => [...prev.slice(-4), item]);
      window.setTimeout(() => dismiss(id), item.durationMs ?? 3800);
    },
    [dismiss]
  );

  const api = useMemo<ToastCtx>(
    () => ({
      push,
      success: (message, title) => push({ kind: 'success', message, title }),
      error: (message, title) => push({ kind: 'error', message, title, durationMs: 5200 }),
      info: (message, title) => push({ kind: 'info', message, title }),
      warning: (message, title) => push({ kind: 'warning', message, title }),
    }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.kind]}`} role="status">
            <div className={styles.body}>
              {t.title && <strong>{t.title}</strong>}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
