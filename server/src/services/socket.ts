import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';
import { execute, queryRows } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';

let io: Server | null = null;

const onlineUsers = new Map<number, Set<string>>(); // userId -> socketIds

export function initSocket(httpServer: HttpServer): Server {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

  io = new Server(httpServer, {
    cors: { origin, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers.authorization as string)?.replace('Bearer ', '');
      if (!token) return next(new Error('Unauthorized'));
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      const payload = jwt.verify(token, secret) as JwtPayload;
      (socket as Socket & { user: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: JwtPayload }).user;
    if (!user) {
      socket.disconnect();
      return;
    }

    const uid = user.userId;
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid)!.add(socket.id);

    void setUserStatus(uid, 'online');
    io?.emit('presence:update', { userId: uid, status: 'online' });

    socket.join(`user:${uid}`);

    socket.on('chat:join', (payload: { groupId?: number; peerId?: number }) => {
      if (payload.groupId) socket.join(`group:${payload.groupId}`);
      if (payload.peerId) {
        const room = dmRoom(uid, payload.peerId);
        socket.join(room);
      }
    });

    socket.on(
      'chat:message',
      async (payload: {
        text: string;
        receiverId?: number;
        groupId?: number;
        attachments?: unknown;
      }) => {
        if (!payload.text?.trim()) return;
        const text = payload.text.trim().slice(0, 5000);
        const attachments = payload.attachments
          ? JSON.stringify(payload.attachments)
          : null;

        const result = await execute(
          `INSERT INTO messages (sender_id, receiver_id, group_id, text, attachments_json)
           VALUES (?, ?, ?, ?, ?)`,
          [uid, payload.receiverId ?? null, payload.groupId ?? null, text, attachments],
          'socket:message'
        );

        const message = {
          id: result?.insertId ?? Date.now(),
          sender_id: uid,
          sender_name: user.email,
          receiver_id: payload.receiverId ?? null,
          group_id: payload.groupId ?? null,
          text,
          attachments_json: payload.attachments ?? null,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        if (payload.groupId) {
          io?.to(`group:${payload.groupId}`).emit('chat:message', message);
        } else if (payload.receiverId) {
          const room = dmRoom(uid, payload.receiverId);
          io?.to(room).emit('chat:message', message);
          io?.to(`user:${payload.receiverId}`).emit('chat:notify', {
            from: uid,
            text: text.slice(0, 80),
          });
        }
      }
    );

    socket.on('chat:typing', (payload: { receiverId?: number; groupId?: number }) => {
      if (payload.groupId) {
        socket.to(`group:${payload.groupId}`).emit('chat:typing', {
          userId: uid,
          groupId: payload.groupId,
        });
      } else if (payload.receiverId) {
        io?.to(`user:${payload.receiverId}`).emit('chat:typing', {
          userId: uid,
          receiverId: payload.receiverId,
        });
      }
    });

    socket.on('chat:read', async (payload: { messageIds: number[] }) => {
      if (!payload.messageIds?.length) return;
      const placeholders = payload.messageIds.map(() => '?').join(',');
      await execute(
        `UPDATE messages SET is_read = 1 WHERE id IN (${placeholders}) AND receiver_id = ?`,
        [...payload.messageIds, uid],
        'socket:read'
      );
      socket.broadcast.emit('chat:read', { messageIds: payload.messageIds, by: uid });
    });

    socket.on('disconnect', () => {
      const set = onlineUsers.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(uid);
          void setUserStatus(uid, 'offline');
          io?.emit('presence:update', { userId: uid, status: 'offline' });
        }
      }
    });
  });

  return io;
}

function dmRoom(a: number, b: number): string {
  return `dm:${Math.min(a, b)}:${Math.max(a, b)}`;
}

async function setUserStatus(userId: number, status: 'online' | 'offline') {
  await execute('UPDATE users SET status = ? WHERE id = ?', [status, userId], 'presence');
}

export function getIo(): Server | null {
  return io;
}

export function getOnlineUserIds(): number[] {
  return Array.from(onlineUsers.keys());
}

export async function getPresenceList(): Promise<{ id: number; status: string }[]> {
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT id, status FROM users ORDER BY name',
    [],
    'presence:list'
  );
  return rows.map((r) => ({
    id: Number(r.id),
    status: onlineUsers.has(Number(r.id)) ? 'online' : String(r.status),
  }));
}
