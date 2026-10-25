'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Todo, SubTodo } from '@/types';
import styles from './TodoList.module.css';

const COLUMNS: { key: Todo['status']; label: string; hint: string }[] = [
  { key: 'pending', label: 'Backlog', hint: 'Hazır' },
  { key: 'in_progress', label: 'Focus', hint: 'Devam ediyor' },
  { key: 'completed', label: 'Done', hint: 'Tamamlandı' },
];

const STICKERS = ['🔥', '⚡', '🎯', '💡', '📌', '🚀', '✅', '⭐', '🧠', '📅'];

type SortMode = 'order' | 'priority' | 'created' | 'due';

function toStars(p: Todo['priority']): number {
  if (typeof p === 'number' && Number.isFinite(p)) return Math.max(0, Math.min(5, p));
  const s = String(p).toLowerCase();
  if (s === 'high' || s === 'ai_suggested') return 4.5;
  if (s === 'medium') return 3;
  if (s === 'low') return 1.5;
  return 0;
}

function StarRow({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
}) {
  const stars = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  return (
    <div className={`${styles.stars} ${size === 'sm' ? styles.starsSm : ''}`} role="group">
      {stars.map((s) => {
        const filled = value >= s;
        const half = !Number.isInteger(s);
        return (
          <button
            key={s}
            type="button"
            className={`${styles.star} ${filled ? styles.starOn : ''} ${half ? styles.starHalf : ''}`}
            title={`${s}`}
            disabled={!onChange}
            onClick={() => onChange?.(s)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [sticker, setSticker] = useState<string | null>(null);
  const [priority, setPriority] = useState(0);
  const [dueAt, setDueAt] = useState('');
  const [minPrio, setMinPrio] = useState(0);
  const [sort, setSort] = useState<SortMode>('order');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [subDraft, setSubDraft] = useState<Record<number, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ include: 'subs', sort });
    if (minPrio > 0) q.set('min_priority', String(minPrio));
    const res = await api<Todo[]>(`/todos?${q.toString()}`);
    setTodos(res.data ?? []);
  }, [sort, minPrio]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.status === 'completed').length;
    const active = todos.filter((t) => t.status === 'in_progress').length;
    return { total, done, active, rate: total ? Math.round((done / total) * 100) : 0 };
  }, [todos]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const body: Record<string, unknown> = {
      title: title.trim(),
      priority,
    };
    if (notes.trim()) body.notes = notes.trim();
    if (sticker) body.sticker = sticker;
    if (dueAt) body.due_at = dueAt;
    const res = await api<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.success && res.data) {
      setTodos((prev) => [res.data!, ...prev]);
      setTitle('');
      setNotes('');
      setSticker(null);
      setPriority(0);
      setDueAt('');
      setShowAdvanced(false);
    }
  }

  async function patchTodo(id: number, patch: Partial<Todo>) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await api(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async function setStatus(id: number, status: Todo['status']) {
    await patchTodo(id, { status });
  }

  async function rateAi(id: number) {
    const res = await api<Todo>(`/todos/${id}/ai-rate`, { method: 'POST' });
    if (res.success && res.data) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...res.data } : t)));
    }
  }

  async function remove(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await api(`/todos/${id}`, { method: 'DELETE' });
  }

  async function addSub(todoId: number) {
    const text = (subDraft[todoId] || '').trim();
    if (!text) return;
    const res = await api<SubTodo>(`/todos/${todoId}/sub`, {
      method: 'POST',
      body: JSON.stringify({ title: text }),
    });
    if (res.success && res.data) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId
            ? { ...t, sub_todos: [...(t.sub_todos || []), res.data!] }
            : t
        )
      );
      setSubDraft((d) => ({ ...d, [todoId]: '' }));
      setExpanded((e) => ({ ...e, [todoId]: true }));
    }
  }

  async function toggleSub(todoId: number, sub: SubTodo) {
    const next = !sub.is_done;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? {
              ...t,
              sub_todos: (t.sub_todos || []).map((s) =>
                s.id === sub.id ? { ...s, is_done: next } : s
              ),
            }
          : t
      )
    );
    await api(`/todos/${todoId}/sub/${sub.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_done: next }),
    });
  }

  function onDrop(status: Todo['status']) {
    if (dragId == null) return;
    void setStatus(dragId, status);
    setDragId(null);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Todos</h1>
          <p className={styles.sub}>
            Yıldız rating · sticker · alt görev · AI öncelik · sürükle-bırak
          </p>
        </div>
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span>Toplam</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.stat}>
            <span>Aktif</span>
            <strong>{stats.active}</strong>
          </div>
          <div className={styles.stat}>
            <span>Bitti</span>
            <strong>{stats.done}</strong>
          </div>
          <div className={styles.stat}>
            <span>Oran</span>
            <strong>{stats.rate}%</strong>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.create} onSubmit={onCreate}>
          <div className={styles.createMain}>
            <input
              className={styles.input}
              placeholder="Ne yapılacak?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
            <button
              className={styles.addBtn}
              type="submit"
              disabled={busy || !title.trim()}
            >
              Ekle
            </button>
            <button
              type="button"
              className={styles.advToggle}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? '−' : '+'}
            </button>
          </div>

          {showAdvanced && (
            <div className={styles.advanced}>
              <textarea
                className={styles.notes}
                placeholder="Not / açıklama (opsiyonel)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
              <div className={styles.row}>
                <label className={styles.label}>Önem</label>
                <StarRow value={priority} onChange={setPriority} />
                <span className={styles.prioNum}>{priority.toFixed(1)}</span>
              </div>
              <div className={styles.row}>
                <label className={styles.label}>Sticker</label>
                <div className={styles.stickerRow}>
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.stickerBtn} ${sticker === s ? styles.stickerOn : ''}`}
                      onClick={() => setSticker((cur) => (cur === s ? null : s))}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.row}>
                <label className={styles.label}>Son tarih</label>
                <input
                  type="datetime-local"
                  className={styles.dueInput}
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
            </div>
          )}
        </form>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Min yıldız</span>
            {[0, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.chip} ${minPrio === n ? styles.chipOn : ''}`}
                onClick={() => setMinPrio(n)}
              >
                {n === 0 ? 'Tümü' : `${n}+`}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Sıra</span>
            {(
              [
                ['order', 'Sıra'],
                ['priority', 'Yıldız'],
                ['due', 'Tarih'],
                ['created', 'Yeni'],
              ] as [SortMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`${styles.chip} ${sort === id ? styles.chipOn : ''}`}
                onClick={() => setSort(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const items = todos.filter((t) => t.status === col.key);
          return (
            <section
              key={col.key}
              className={styles.column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
            >
              <div className={styles.colHead}>
                <h2 className={styles.colTitle}>{col.label}</h2>
                <span className={styles.count}>{items.length}</span>
              </div>
              <p className={styles.colHint}>{col.hint}</p>
              <div className={styles.list}>
                {items.map((t) => {
                  const stars = toStars(t.priority);
                  const open = !!expanded[t.id];
                  const subs = t.sub_todos || [];
                  return (
                    <article
                      key={t.id}
                      className={`${styles.card} ${dragId === t.id ? styles.dragging : ''}`}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                    >
                      <div className={styles.cardTop}>
                        <div className={styles.cardTitle}>
                          {t.sticker && <span className={styles.sticker}>{t.sticker}</span>}
                          <strong>{t.title}</strong>
                        </div>
                        <StarRow
                          value={stars}
                          size="sm"
                          onChange={(v) => void patchTodo(t.id, { priority: v })}
                        />
                      </div>

                      {t.notes && <p className={styles.desc}>{t.notes}</p>}
                      {t.description && !t.notes && (
                        <p className={styles.desc}>{t.description}</p>
                      )}

                      <div className={styles.meta}>
                        {t.ai_score != null && (
                          <span className={styles.score}>
                            AI {Math.round(Number(t.ai_score))}
                          </span>
                        )}
                        {(t.due_at || t.due_date) && (
                          <span className={styles.due}>
                            {String(t.due_at || t.due_date).slice(0, 16)}
                          </span>
                        )}
                        {subs.length > 0 && (
                          <button
                            type="button"
                            className={styles.subToggle}
                            onClick={() =>
                              setExpanded((e) => ({ ...e, [t.id]: !open }))
                            }
                          >
                            {open ? '▾' : '▸'} {subs.filter((s) => s.is_done).length}/
                            {subs.length}
                          </button>
                        )}
                      </div>

                      {open && (
                        <div className={styles.subList}>
                          {subs.map((s) => (
                            <label key={s.id} className={styles.subItem}>
                              <input
                                type="checkbox"
                                checked={s.is_done}
                                onChange={() => void toggleSub(t.id, s)}
                              />
                              <span className={s.is_done ? styles.subDone : ''}>
                                {s.title}
                              </span>
                            </label>
                          ))}
                          <div className={styles.subAdd}>
                            <input
                              className={styles.subInput}
                              placeholder="Alt görev ekle…"
                              value={subDraft[t.id] || ''}
                              onChange={(e) =>
                                setSubDraft((d) => ({
                                  ...d,
                                  [t.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void addSub(t.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className={styles.subBtn}
                              onClick={() => void addSub(t.id)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {!open && subs.length === 0 && (
                        <button
                          type="button"
                          className={styles.subToggle}
                          onClick={() => setExpanded((e) => ({ ...e, [t.id]: true }))}
                        >
                          + Alt görev
                        </button>
                      )}

                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.aiBtn}
                          onClick={() => void rateAi(t.id)}
                        >
                          AI rate
                        </button>
                        <button
                          type="button"
                          className={styles.delBtn}
                          onClick={() => void remove(t.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </article>
                  );
                })}
                {items.length === 0 && (
                  <div className={styles.emptyCol}>Buraya bırak</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
