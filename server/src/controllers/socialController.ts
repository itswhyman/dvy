import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { logEvent } from '../services/loggerService.js';

export async function follow(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const targetId = Number(req.params.id);
  if (!targetId || targetId === userId) {
    res.status(422).json({ success: false, error: 'Invalid target user.' });
    return;
  }

  // blocked?
  const blocked = await queryRows<RowDataPacket[]>(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [userId, targetId, targetId, userId],
    'social:block-check'
  );
  if (blocked.length) {
    res.status(403).json({ success: false, error: 'Cannot follow this user.' });
    return;
  }

  await execute(
    `INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)`,
    [userId, targetId],
    'social:follow'
  );
  logEvent({
    level: 'info',
    category: 'api',
    message: `User ${userId} followed ${targetId}`,
    userId,
  });
  res.json({ success: true, data: { following: true } });
}

export async function unfollow(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const targetId = Number(req.params.id);
  await execute(
    `DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`,
    [userId, targetId],
    'social:unfollow'
  );
  res.json({ success: true, data: { following: false } });
}

export async function block(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const targetId = Number(req.params.id);
  if (!targetId || targetId === userId) {
    res.status(422).json({ success: false, error: 'Invalid target user.' });
    return;
  }
  await execute(
    `DELETE FROM user_follows
     WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)`,
    [userId, targetId, targetId, userId],
    'social:block-cleanup-follows'
  );
  await execute(
    `INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)`,
    [userId, targetId],
    'social:block'
  );
  logEvent({
    level: 'info',
    category: 'api',
    message: `User ${userId} blocked ${targetId}`,
    userId,
  });
  res.json({ success: true, data: { blocked: true } });
}

export async function unblock(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const targetId = Number(req.params.id);
  await execute(
    `DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?`,
    [userId, targetId],
    'social:unblock'
  );
  res.json({ success: true, data: { blocked: false } });
}

export async function listFollowing(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.status, u.member_color
     FROM user_follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`,
    [userId],
    'social:following'
  );
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      email: String(r.email),
      avatar_url: r.avatar_url ? String(r.avatar_url) : null,
      status: String(r.status),
      member_color: r.member_color ? String(r.member_color) : null,
    })),
  });
}

export async function publicProfile(req: AuthRequest, res: Response): Promise<void> {
  const me = req.user!.userId;
  const id = Number(req.params.id);
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.bio, u.status, u.member_color, u.created_at,
      EXISTS(SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = u.id) AS is_following,
      EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = u.id) AS is_blocked
     FROM users u WHERE u.id = ? LIMIT 1`,
    [me, me, id],
    'social:profile'
  );
  if (!rows[0]) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }
  const r = rows[0];
  res.json({
    success: true,
    data: {
      id: Number(r.id),
      name: String(r.name),
      email: String(r.email),
      avatar_url: r.avatar_url ? String(r.avatar_url) : null,
      bio: r.bio ? String(r.bio) : null,
      status: String(r.status),
      member_color: r.member_color ? String(r.member_color) : null,
      created_at: new Date(r.created_at as string).toISOString(),
      is_following: Boolean(r.is_following),
      is_blocked: Boolean(r.is_blocked),
    },
  });
}
