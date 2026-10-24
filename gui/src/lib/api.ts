import type { ApiResponse } from '@/types';

/**
 * Dynamic API base URL:
 * - Production (same origin / reverse proxy): relative `/api`
 * - Override with NEXT_PUBLIC_API_URL when needed (e.g. separate API host)
 * - Never hardcode localhost in client bundles
 */
function resolveBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  return '/api';
}

const BASE = resolveBase();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('best_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('best_token', token);
  else localStorage.removeItem('best_token');
}

function clientLog(
  level: 'error' | 'warn' | 'info',
  message: string,
  meta?: Record<string, unknown>
) {
  const payload = { ts: new Date().toISOString(), message, ...meta };
  if (level === 'error') console.error('[api]', payload);
  else if (level === 'warn') console.warn('[api]', payload);
  else console.info('[api]', payload);

  // Persist last errors for support / debug (ring of 30)
  try {
    if (typeof window === 'undefined') return;
    const key = 'best_client_logs';
    const prev = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
    const next = [...prev, { level, ...payload }].slice(-30);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = path.startsWith('http')
    ? path
    : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
    if (!res.ok) {
      clientLog('warn', `Request failed (${res.status}) ${path}`, {
        status: res.status,
        error: json.error,
        method: options.method || 'GET',
      });
      return {
        success: false,
        error: json.error || `Request failed (${res.status})`,
        data: json.data,
      };
    }
    return json;
  } catch (err) {
    clientLog('error', `Network error on ${path}`, {
      error: err instanceof Error ? err.message : String(err),
      method: options.method || 'GET',
    });
    return {
      success: false,
      error: 'Network error — server unreachable. Showing offline fallbacks where possible.',
    };
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: import('@/types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    api<{ token: string; user: import('@/types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => api<import('@/types').User>('/auth/me'),
  updateProfile: (body: Partial<{ name: string; bio: string; avatar_url: string }>) =>
    api<import('@/types').User>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
