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

  const TEMPLATES: { id: NoteTemplate; label: string; hint: string }[] = [
    { id: 'blank', label: 'Boş', hint: 'Serbest' },
    { id: 'grid', label: 'Kareli', hint: 'Grid' },
    { id: 'lined', label: 'Çizgili', hint: 'Satır' },
    { id: 'dotted', label: 'Noktalı', hint: 'Dot' },
    { id: 'music', label: 'Müzik', hint: 'Nota' },
    { id: 'calendar', label: 'Takvim', hint: 'Ay' },
  ];

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title || 'Untitled', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Category: ${category} · ${template}`, 14, 32);
    doc.setTextColor(30);
    const lines = doc.splitTextToSize(content || '', 180);
    doc.text(lines, 14, 44);
    doc.save(`${(title || 'note').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  }

  async function runSummarize() {
    if (!active) {
      toast.error('Önce notu kaydedin');
      return;
    }
    const res = await api<{ summary?: string }>(`/notes/${active.id}/summarize`, {
      method: 'POST',
    });
    if (res.success && (res.data as any)?.summary) {
      const summary = (res.data as any).summary as string;
      setContent((c) => `${c.trim()}\n\n---\nAI Özet:\n${summary}`);
      toast.success('Özet eklendi');
    } else if (typeof res.data === 'string') {
      setContent((c) => `${c.trim()}\n\n---\nAI Özet:\n${res.data}`);
      toast.success('Özet eklendi');
    } else {
      toast.error(res.error || 'Özet alınamadı');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Note Studio</h1>
          <p className={styles.sub}>Şablonlar · AI özet · PDF export</p>
        </div>
        <button type="button" className={styles.newBtn} onClick={newNote}>
          + Yeni not
        </button>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <input
            className={styles.search}
            placeholder="Not ara…"
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
                <span>
                  {n.template || 'blank'} · {n.category}
                </span>
              </button>
            ))}
            {!notes.length && <p className={styles.empty}>Henüz not yok</p>}
          </div>
        </aside>

        <form className={styles.editor} onSubmit={save}>
          <input
            className={styles.titleInput}
            placeholder="Başlık"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className={styles.templates}>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tplBtn} ${template === t.id ? styles.tplOn : ''}`}
                onClick={() => setTemplate(t.id)}
                title={t.hint}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.toolbar}>
            <input
              className={styles.catInput}
              placeholder="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <button type="button" className={styles.toolBtn} onClick={exportPdf}>
              PDF
            </button>
            <button type="button" className={styles.toolBtn} onClick={() => void runSummarize()}>
              AI Özet
            </button>
            {active && (
              <button
                type="button"
                className={styles.delBtn}
                onClick={() => remove(active.id)}
              >
                Sil
              </button>
            )}
          </div>
          <textarea
            className={`${styles.body} ${styles[`tpl_${template}`] || ''}`}
            placeholder="Notunu yaz…"
            value={content}
            data-template={template}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
          />
          <button type="submit" className={styles.saveBtn}>
            Kaydet
          </button>
        </form>
      </div>
    </div>
  );
}
