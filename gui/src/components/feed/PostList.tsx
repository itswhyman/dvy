'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ChatContact, Post, PostComment } from '@/types';
import styles from './PostList.module.css';

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.floor(h / 24);
  return `${d}g`;
}

export default function PostList() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [online, setOnline] = useState<ChatContact[]>([]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, PostComment[]>>({});
  const [commentText, setCommentText] = useState('');

  const load = useCallback(async () => {
    const res = await api<Post[]>('/posts');
    setPosts(res.data ?? []);
  }, []);

  const loadPresence = useCallback(async () => {
    const res = await api<ChatContact[]>('/messages/contacts');
    setOnline((res.data ?? []).slice(0, 14));
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
                likes_count: Math.max(0, p.likes_count + (res.data!.liked ? 1 : -1)),
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
      const res = await api<PostComment[]>(`/posts/${postId}/comments`);
      // API may return tree or flat
      const data = (res.data ?? []) as PostComment[];
      setComments((prev) => ({ ...prev, [postId]: data }));
    }
  }

  async function submitComment(postId: number) {
    if (!commentText.trim()) return;
    const res = await api<PostComment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: commentText.trim(), parent_id: null }),
    });
    if (res.data) {
      const entry: PostComment = {
        ...res.data,
        author_name: res.data.author_name || user?.name || 'You',
        text: res.data.text || commentText.trim(),
        replies: res.data.replies || [],
      };
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), entry],
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
      setCommentText('');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Akış</h1>
        <p className={styles.sub}>Hikâyeler · gönderiler · anlık nabız</p>
      </header>

      {/* Stories / active people */}
      <div className={styles.stories} aria-label="Active people">
        {user && (
          <div className={styles.story}>
            <div className={`${styles.storyRing} ${styles.storyOnline}`}>
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt={user.name} />
              ) : (
                <span className={styles.storyFallback}>{initials(user.name)}</span>
              )}
            </div>
            <span className={styles.storyName}>Sen</span>
          </div>
        )}
        {online.map((c) => (
          <div key={c.id} className={styles.story}>
            <div
              className={`${styles.storyRing} ${
                c.status === 'online' ? styles.storyOnline : ''
              }`}
            >
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt={c.name} />
              ) : (
                <span className={styles.storyFallback}>{initials(c.name)}</span>
              )}
            </div>
            <span className={styles.storyName}>{c.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form className={styles.composer} onSubmit={publish}>
        <div className={styles.composerTop}>
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.meAvatar} src={user.avatar_url} alt="" />
          ) : (
            <span className={styles.meAvatarFallback}>{initials(user?.name)}</span>
          )}
          <textarea
            rows={2}
            placeholder="Çalışma alanınla bir güncelleme paylaş…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className={styles.composerActions}>
          <button className={styles.publish} type="submit" disabled={busy || !content.trim()}>
            {busy ? 'Paylaşılıyor…' : 'Paylaş'}
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className={styles.feed}>
        {posts.length === 0 && (
          <div className={styles.empty}>Henüz gönderi yok. İlk paylaşımı sen yap.</div>
        )}
        {posts.map((p) => (
          <article key={p.id} className={styles.card}>
            <div className={styles.cardHead}>
              {p.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.avatar} src={p.author_avatar} alt="" />
              ) : (
                <span className={styles.avatarFallback}>{initials(p.author_name)}</span>
              )}
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{p.author_name || 'Member'}</span>
                <span className={styles.time}>{timeAgo(p.created_at)}</span>
              </div>
            </div>

            <div className={styles.body}>{p.content}</div>

            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.media} src={p.image_url} alt="" />
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${p.liked_by_me ? styles.liked : ''}`}
                onClick={() => toggleLike(p.id)}
              >
                {p.liked_by_me ? '♥' : '♡'} {p.likes_count}
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => toggleComments(p.id)}
              >
                💬 {p.comments_count}
              </button>
            </div>

            {openComments === p.id && (
              <div className={styles.comments}>
                {(comments[p.id] ?? []).map((c) => (
                  <div key={c.id} className={styles.comment}>
                    {c.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.commentAvatar} src={c.author_avatar} alt="" />
                    ) : (
                      <span className={styles.commentAvatarFallback}>
                        {initials(c.author_name)}
                      </span>
                    )}
                    <div className={styles.commentBody}>
                      <strong>{c.author_name || 'User'}</strong>
                      <span>{c.text}</span>
                      {(c.replies || []).map((r) => (
                        <div key={r.id} className={styles.reply}>
                          <strong>{r.author_name || 'User'}</strong>
                          <span>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className={styles.commentForm}>
                  <input
                    placeholder="Yorum yaz…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void submitComment(p.id);
                      }
                    }}
                  />
                  <button type="button" onClick={() => void submitComment(p.id)}>
                    Gönder
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
