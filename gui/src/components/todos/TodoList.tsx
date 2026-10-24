'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Todo } from '@/types';
import styles from './TodoList.module.css';

const COLUMNS: { key: Todo['status']; label: string; hint: string }[] = [
  { key: 'pending', label: 'Backlog', hint: 'Ready to start' },
  { key: 'in_progress', label: 'Focus', hint: 'In motion' },
  { key: 'completed', label: 'Done', hint: 'Shipped' },
];

type PriorityFilter = 'all' | 'high' | 'medium' | 'low' | 'ai_suggested';

const PRIORITY_FILTERS: { id: PriorityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'ai_suggested', label: 'AI' },
];

function prioClass(priority: Todo['priority']): string {
  const key = `p_${String(priority)}`;
  const map = styles as Record<string, string>;
  return map[key] ? `${styles.prio} ${map[key]}` : styles.prio;
}

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
          <h1 className={styles.title}>Todos</h1>
          <p className={styles.sub}>Kanban flow · AI priority · drag between columns</p>
        </div>
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.stat}>
            <span>Active</span>
            <strong>{stats.active}</strong>
          </div>
          <div className={styles.stat}>
            <span>Done</span>
            <strong>{stats.done}</strong>
          </div>
          <div className={styles.stat}>
            <span>Rate</span>
            <strong>{stats.rate}%</strong>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.create} onSubmit={onCreate}>
          <input
            className={styles.input}
            placeholder="What needs focus next?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className={styles.addBtn} type="submit" disabled={busy || !title.trim()}>
            Add task
          </button>
        </form>
        <div className={styles.filters}>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${styles.chip} ${filter === f.id ? styles.chipOn : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
              <div className={styles.colHead}>
                <h2 className={styles.colTitle}>{col.label}</h2>
                <span className={styles.count}>{items.length}</span>
              </div>
              <p className={styles.colHint}>{col.hint}</p>
              <div className={styles.list}>
                {items.map((t) => (
                  <article
                    key={t.id}
                    className={`${styles.card} ${dragId === t.id ? styles.dragging : ''}`}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                  >
                    <div className={styles.cardTop}>
                      <strong>{t.title}</strong>
                      <span className={prioClass(t.priority)}>{String(t.priority)}</span>
                    </div>
                    {t.description && <p className={styles.desc}>{t.description}</p>}
                    <div className={styles.meta}>
                      {t.ai_score != null && (
                        <span className={styles.score}>AI {Math.round(Number(t.ai_score))}</span>
                      )}
                      {(t.due_date || t.due_at) && (
                        <span className={styles.due}>
                          {String(t.due_date || t.due_at).slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <button type="button" className={styles.aiBtn} onClick={() => rateAi(t.id)}>
                        AI rate
                      </button>
                      <button type="button" className={styles.delBtn} onClick={() => remove(t.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {items.length === 0 && <div className={styles.emptyCol}>Drop tasks here</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
