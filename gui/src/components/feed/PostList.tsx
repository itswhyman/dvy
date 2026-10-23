'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Post } from '@/types';
import styles from './PostList.module.css';

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api<Post[]>('/posts');
    setPosts(res.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const res = await api<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify({ content: content.trim() }),
    });
    setBusy(false);
    if (res.data) {
      setPosts((prev) => [res.data!, ...prev]);
      setContent('');
    }
  }

  async function toggleLike(id: number) {
    const res = await api<{ liked: boolean }>(`/posts/${id}/like`, { method: 'POST' });
    if (res.success && res.data) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked_by_me: res.data!.liked,
                likes_count: p.likes_count + (res.data!.liked ? 1 : -1),
              }
            : p
        )
      );
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Community Feed</h1>
        <p className={styles.sub}>Team updates and announcements</p>
      </header>

      <form className={styles.composer} onSubmit={publish}>
        <textarea
          className={styles.textarea}
          placeholder="Share an update…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <button className={styles.publish} type="submit" disabled={busy}>
          Publish
        </button>
      </form>

      <div className={styles.feed}>
        {posts.map((p) => (
          <article key={p.id} className={styles.card}>
            <div className={styles.author}>
              <div className={styles.avatar}>{(p.author_name || '?')[0]}</div>
              <div>
                <strong>{p.author_name || 'User'}</strong>
                <span className={styles.time}>
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <p className={styles.body}>{p.content}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.like} ${p.liked_by_me ? styles.liked : ''}`}
                onClick={() => toggleLike(p.id)}
              >
                ♥ {p.likes_count}
              </button>
              <span className={styles.comments}>{p.comments_count} comments</span>
            </div>
          </article>
        ))}
        {!posts.length && <p className={styles.empty}>No posts yet — be the first.</p>}
      </div>
    </div>
  );
}
