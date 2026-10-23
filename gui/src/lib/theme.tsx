'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'best_theme';

function applyDom(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // LIGHT is the default
  const [theme, setThemeState] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
        applyDom(stored);
      } else {
        applyDom('light');
      }
    } catch {
      applyDom('light');
    }
    setReady(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch { /* ignore */ }
    applyDom(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  // Avoid flash: still render children; CSS defaults to light via :root
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
