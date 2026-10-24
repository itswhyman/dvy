'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Todo } from '@/types';
import styles from './TodoList.module.css';

const COLUMNS: { key: Todo['status']; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

type PriorityFilter = 'all' | 'high' | 'medium' | 'low' | 'ai_suggested';

function prioClass(priority: Todo['priority']): string {
  const key = `p_${String(priority)}`;
  const map = styles as Record<string, string>;
  return map[key] ? `${styles.prio} ${map[key]}` : styles.prio;
}

const PRIORITY_FILTERS: PriorityFilter[] = [
  'all',
  'high',
  'medium',
  'low',
  'ai_suggested',
];

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await api<Todo[]>('/todos');
    setTodos(res.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return todos;
    return todos.filter((t) => String(t.priority) === filter);
  }, [todos, filter]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const res = await api<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim() }),
    });
    setBusy(false);
    if (res.success && res.data) {
      setTodos((prev) => [res.data!, ...prev]);
      setTitle('');
    }
  }

  async function setStatus(id: number, status: Todo['status']) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await api(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
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

  function onDrop(status: Todo['status']) {
    if (dragId == null) return;
    void setStatus(dragId, status);
    setDragId(null);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Smart Todos</h1>
          <p className={styles.sub}>Kanban + AI priority scoring</p>
        </div>
        <div className={styles.filters}>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${filter === f ? styles.chipOn : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      <form className={styles.create} onSubmit={onCreate}>
        <input
          className={styles.input}
          placeholder="New task title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className={styles.addBtn} type="submit" disabled={busy}>
          Add
        </button>
      </form>

      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const items = filtered.filter((t) => t.status === col.key);
          return (
            <section
              key={col.key}
              className={styles.column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
            >
              <h2 className={styles.colTitle}>
                {col.label}
                <span className={styles.count}>{items.length}</span>
              </h2>
              <div className={styles.list}>
                {items.map((t) => (
                  <article
                    key={t.id}
                    className={styles.card}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                  >
                    <div className={styles.cardTop}>
                      <strong>{t.title}</strong>
                      <span className={prioClass(t.priority)}>
                        {String(t.priority)}
                      </span>
                    </div>
                    {t.description && <p className={styles.desc}>{t.description}</p>}
                    <div className={styles.meta}>
                      {t.ai_score != null && (
                        <span className={styles.score}>AI {Math.round(t.ai_score)}</span>
                      )}
                      {t.due_date && <span className={styles.due}>{t.due_date}</span>}
                    </div>
                    <div className={styles.actions}>
                      <button type="button" className={styles.aiBtn} onClick={() => rateAi(t.id)}>
                        Rate with AI
                      </button>
                      <button type="button" className={styles.delBtn} onClick={() => remove(t.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
