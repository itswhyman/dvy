'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ChatContact, ChatMessage } from '@/types';
import styles from './ChatUI.module.css';

/**
 * Dynamic Socket.IO URL:
 * - NEXT_PUBLIC_WS_URL set → use it
 * - Browser (production / same-origin) → undefined → connects to current origin
 *   (works with next.config.mjs /socket.io rewrite)
 * - SSR / fallback → localhost:4000 only for local dev safety
 */
function resolveWsUrl(): string | undefined {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    // Same origin — Next.js rewrite proxies /socket.io → Express
    return undefined;
  }
  return 'http://localhost:4000';
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ChatUI() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [peer, setPeer] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerRef = useRef<ChatContact | null>(null);

  // Keep peer in ref so socket handlers always see current value
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  const loadContacts = useCallback(async () => {
    const res = await api<ChatContact[]>('/messages/contacts');
    setContacts(res.data ?? []);
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  // Socket connection — only once (not on every peer change)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('best_token') : null;
    if (!token) return;

    const wsUrl = resolveWsUrl();
    const socket = io(wsUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.debug('[socket] connected', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err.message);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      const currentPeer = peerRef.current;
      setMessages((prev) => {
        if (
          currentPeer &&
          (msg.sender_id === currentPeer.id || msg.receiver_id === currentPeer.id)
        ) {
          return [...prev, msg];
        }
        return prev;
      });
    });

    socket.on('chat:notify', (n: { from: number; text: string }) => {
      const id = Date.now();
      setToasts((t) => [...t, { id, text: `New message: ${n.text}` }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    });

    socket.on('chat:typing', (p: { userId: number }) => {
      const currentPeer = peerRef.current;
      if (currentPeer && p.userId === currentPeer.id) {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1500);
      }
    });

    socket.on('presence:update', (p: { userId: number; status: string }) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === p.userId ? { ...c, status: p.status } : c))
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // only once on mount

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openChat(c: ChatContact) {
    setPeer(c);
    setMessages([]);
    const res = await api<ChatMessage[]>(`/messages/dm/${c.id}`);
    setMessages(res.data ?? []);
    socketRef.current?.emit('chat:join', { peerId: c.id });
  }

  function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !peer) return;
    socketRef.current?.emit('chat:message', {
      text: text.trim(),
      receiverId: peer.id,
    });
    const optimistic: ChatMessage = {
      id: Date.now(),
      sender_id: user!.id,
      receiver_id: peer.id,
      group_id: null,
      text: text.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      sender_name: user!.name,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
  }

  function onType(v: string) {
    setText(v);
    if (peer) socketRef.current?.emit('chat:typing', { receiverId: peer.id });
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>Chat</h1>
        <p className={styles.sub}>Real-time messaging · presence · typing</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.contacts}>
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.contact} ${peer?.id === c.id ? styles.contactOn : ''}`}
              onClick={() => openChat(c)}
            >
              <span className={styles.av}>{(c.name || '?')[0]}</span>
              <span className={styles.cinfo}>
                <strong>{c.name}</strong>
                <em className={c.status === 'online' ? styles.online : styles.offline}>
                  {c.status}
                </em>
              </span>
            </button>
          ))}
        </aside>

        <section className={styles.panel}>
          {!peer ? (
            <div className={styles.empty}>Select a contact to start chatting</div>
          ) : (
            <>
              <div className={styles.panelHead}>
                <strong>{peer.name}</strong>
                <span className={peer.status === 'online' ? styles.online : styles.offline}>
                  {peer.status}
                </span>
              </div>
              <div className={styles.messages}>
                {messages.map((m, i) => {
                  const showDay =
                    i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at);
                  return (
                    <div key={m.id}>
                      {showDay && <div className={styles.dayDivider}>{dayLabel(m.created_at)}</div>}
                      <div
                        className={`${styles.bubble} ${
                          m.sender_id === user?.id ? styles.mine : styles.theirs
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                {typing && <div className={styles.typing}>typing…</div>}
                <div ref={bottomRef} />
              </div>
              <form className={styles.composer} onSubmit={send}>
                <input
                  className={styles.input}
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  placeholder="Message…"
                />
                <button className={styles.send} type="submit">
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      <div className={styles.toasts}>
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
