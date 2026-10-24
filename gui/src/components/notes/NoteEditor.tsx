'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '@/lib/api';
import { useToast } from '@/components/common/ToastProvider';
import type { Note, NoteTemplate } from '@/types';
import styles from './NoteEditor.module.css';

export default function NoteEditor() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [template, setTemplate] = useState<NoteTemplate>('blank');
  const [q, setQ] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await api<Note[]>(`/notes${params}`);
    setNotes(res.data ?? []);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  function select(n: Note) {
    setActive(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category);
    setTemplate((n.template as NoteTemplate) || 'blank');
  }

  function newNote() {
    setActive(null);
    setTitle('');
    setContent('');
    setCategory('general');
    setTemplate('blank');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (active) {
      const res = await api<Note>(`/notes/${active.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, content, category, template }),
      });
      if (res.data) {
        setNotes((prev) => prev.map((n) => (n.id === res.data!.id ? res.data! : n)));
        setActive(res.data);
        toast.success('Note saved');
      } else {
        toast.error(res.error || 'Save failed');
      }
    } else {
      const res = await api<Note>('/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content, category, template }),
      });
      if (res.data) {
        setNotes((prev) => [res.data!, ...prev]);
        setActive(res.data);
        toast.success('Note created');
      } else {
        toast.error(res.error || 'Create failed');
      }
    }
  }

  async function remove(id: number) {
    await api(`/notes/${id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (active?.id === id) newNote();
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title || 'Untitled', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Category: ${category}`, 14, 32);
    doc.setTextColor(30);
    const lines = doc.splitTextToSize(content || '', 180);
    doc.text(lines, 14, 44);
    doc.save(`${(title || 'note').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Note Studio</h1>
          <p className={styles.sub}>Rich notes with PDF export</p>
        </div>
        <button type="button" className={styles.newBtn} onClick={newNote}>
          + New note
        </button>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <input
            className={styles.search}
            placeholder="Search notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className={styles.list}>
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${active?.id === n.id ? styles.itemOn : ''}`}
                onClick={() => select(n)}
              >
                <strong>{n.title}</strong>
                <span>{n.category}</span>
              </button>
            ))}
            {!notes.length && <p className={styles.empty}>No notes yet</p>}
          </div>
        </aside>

        <form className={styles.editor} onSubmit={save}>
          <input
            className={styles.titleInput}
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className={styles.toolbar}>
            <input
              className={styles.catInput}
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <button type="button" className={styles.toolBtn} onClick={exportPdf}>
              Export PDF
            </button>
            {active && (
              <button
                type="button"
                className={styles.delBtn}
                onClick={() => remove(active.id)}
              >
                Delete
              </button>
            )}
          </div>
          <textarea
            className={styles.body}
            placeholder="Write your note…"
            value={content}
          data-template={template}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
          />
          <button type="submit" className={styles.saveBtn}>
            Save note
          </button>
        </form>
      </div>
    </div>
  );
}
