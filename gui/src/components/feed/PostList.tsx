'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ChatContact, Post } from '@/types';
import styles from './PostList.module.css';

export default function PostList() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [online, setOnline] = useState<ChatContact[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<
    Record<number, { id: number; text: string; author_name?: string; created_at: string }[]>
  >({});
  const [commentText, setCommentText] = useState('');

  const load = useCallback(async () => {
    const res = await api<Post[]>('/posts');
    setPosts(res.data ?? []);
  }, []);

  const loadPresence = useCallback(async () => {
    const res = await api<ChatContact[]>('/messages/contacts');
    setOnline((res.data ?? []).slice(0, 12));
  }, []);

  useEffect(() => {
    void load();
    void loadPresence();
  }, [load, loadPresence]);

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

  async function toggleComments(postId: number) {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    if (!comments[postId]) {
      const res = await api<{ id: number; text: string; author_name?: string; created_at: string }[]>(
        `/posts/${postId}/comments`
      );
      setComments((prev) => ({ ...prev, [postId]: res.data ?? [] }));
    }
  }

  async function submitComment(postId: number) {
    if (!commentText.trim()) return;
    const res = await api<{ id: number; text: string; author_name?: string; created_at: string }>(
      `/posts/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() }),
      }
    );
    if (res.data) {
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), res.data!],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
      setCommentText('');
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Home</h1>
          <p className={styles.sub}>Workspace pulse · team updates · social</p>
        </div>
      </header>

      <section className={styles.stories} aria-label="Active workspace">
        <div className={styles.storyItem}>
          <div className={`${styles.storyRing} ${styles.storyYou}`}>
            <span>{(user?.name || '?')[0]}</span>
          </div>
          <em>You</em>
        </div>
        {online.map((c) => (
          <div key={c.id} className={styles.storyItem}>
            <div
              className={`${styles.storyRing} ${
                c.status === 'online' ? styles.storyOnline : ''
              }`}
            >
              <span>{(c.name || '?')[0]}</span>
            </div>
            <em>{c.name?.split(' ')[0] || 'User'}</em>
          </div>
        ))}
      </section>

      <form className={styles.composer} onSubmit={publish}>
        <div className={styles.composerTop}>
          <div className={styles.composerAv}>{(user?.name || '?')[0]}</div>
          <textarea
            className={styles.textarea}
            placeholder="Share an update with your workspace…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
        </div>
        <div className={styles.composerBar}>
          <span className={styles.hint}>Markdown-friendly · keep it short</span>
          <button className={styles.publish} type="submit" disabled={busy || !content.trim()}>
            {busy ? 'Posting…' : 'Publish'}
          </button>
        </div>
      </form>

      <div className={styles.feed}>
        {posts.length === 0 && (
          <div className={styles.empty}>No posts yet. Be the first to share something.</div>
        )}
        {posts.map((p) => (
          <article key={p.id} className={styles.card}>
            <div className={styles.author}>
              <div className={styles.avatar}>{(p.author_name || '?')[0]}</div>
              <div className={styles.authorMeta}>
                <strong>{p.author_name || 'User'}</strong>
                <span>{timeAgo(p.created_at)}</span>
              </div>
            </div>

            <p className={styles.content}>{p.content}</p>

            {p.image_url && (
              <div className={styles.media}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" />
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.action} ${p.liked_by_me ? styles.liked : ''}`}
                onClick={() => toggleLike(p.id)}
              >
                {p.liked_by_me ? '♥' : '♡'} {p.likes_count}
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={() => toggleComments(p.id)}
              >
                💬 {p.comments_count}
              </button>
            </div>

            {openComments === p.id && (
              <div className={styles.comments}>
                {(comments[p.id] ?? []).map((c) => (
                  <div key={c.id} className={styles.comment}>
                    <strong>{c.author_name || 'User'}</strong>
                    <span>{c.text}</span>
                  </div>
                ))}
                <div className={styles.commentForm}>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void submitComment(p.id);
                      }
                    }}
                  />
                  <button type="button" onClick={() => void submitComment(p.id)}>
                    Reply
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
