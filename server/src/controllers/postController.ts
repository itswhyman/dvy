import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { logEvent } from '../services/loggerService.js';

function mapPost(r: RowDataPacket) {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    content: String(r.content),
    image_url: r.image_url ? String(r.image_url) : null,
    likes_count: Number(r.likes_count ?? 0),
    comments_count: Number(r.comments_count ?? 0),
    created_at: new Date(r.created_at as string).toISOString(),
    author_name: r.author_name ? String(r.author_name) : undefined,
    author_avatar: r.author_avatar != null ? String(r.author_avatar) : null,
    liked_by_me: Boolean(r.liked_by_me),
  };
}

function mapComment(r: RowDataPacket) {
  return {
    id: Number(r.id),
    post_id: Number(r.post_id),
    user_id: Number(r.user_id),
    parent_id: r.parent_id != null ? Number(r.parent_id) : null,
    text: String(r.text ?? r.body ?? ''),
    created_at: new Date(r.created_at as string).toISOString(),
    author_name: r.author_name ? String(r.author_name) : undefined,
    author_avatar: r.author_avatar != null ? String(r.author_avatar) : null,
  };
}

function buildCommentTree(
  flat: ReturnType<typeof mapComment>[]
): (ReturnType<typeof mapComment> & { replies: ReturnType<typeof mapComment>[] })[] {
  const byId = new Map<number, ReturnType<typeof mapComment> & { replies: ReturnType<typeof mapComment>[] }>();
  for (const c of flat) {
    byId.set(c.id, { ...c, replies: [] });
  }
  const roots: (ReturnType<typeof mapComment> & { replies: ReturnType<typeof mapComment>[] })[] = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function listPosts(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? 0;
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_me
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE NOT EXISTS (
       SELECT 1 FROM user_blocks b
       WHERE (b.blocker_id = ? AND b.blocked_id = p.user_id)
          OR (b.blocker_id = p.user_id AND b.blocked_id = ?)
     )
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [userId, userId, userId],
    'posts:list'
  );
  res.json({ success: true, data: rows.map(mapPost) });
}

export async function createPost(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { content, image_url } = req.body as { content: string; image_url?: string };

  if (!content?.trim()) {
    res.status(422).json({ success: false, error: 'Content required.' });
    return;
  }

  // tier post limit (best-effort)
  const subs = await queryRows<RowDataPacket[]>(
    'SELECT post_limit FROM subscriptions WHERE user_id = ? LIMIT 1',
    [userId],
    'posts:limit'
  );
  if (subs[0]?.post_limit != null) {
    const countRows = await queryRows<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM posts WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId],
      'posts:month-count'
    );
    const used = Number(countRows[0]?.c ?? 0);
    const limit = Number(subs[0].post_limit);
    if (used >= limit) {
      res.status(403).json({
        success: false,
        error: `Monthly post limit reached (${limit}). Upgrade your plan.`,
      });
      return;
    }
  }

  const result = await execute(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [userId, content.trim(), image_url || null],
    'posts:create'
  );

  if (!result?.insertId) {
    logEvent({
      level: 'error',
      category: 'api',
      message: 'Could not create post',
      userId,
    });
    res.status(503).json({ success: false, error: 'Could not create post.' });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    `SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar, 0 AS liked_by_me
     FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [result.insertId],
    'posts:create:read'
  );
  res.status(201).json({ success: true, data: rows[0] ? mapPost(rows[0]) : null });
}

export async function toggleLike(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const postId = Number(req.params.id);

  const existing = await queryRows<RowDataPacket[]>(
    'SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ?',
    [postId, userId],
    'posts:like:check'
  );

  if (existing.length) {
    await execute(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId],
      'posts:unlike'
    );
    await execute(
      'UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
      [postId],
      'posts:like:dec'
    );
    res.json({ success: true, data: { liked: false } });
  } else {
    await execute(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId],
      'posts:like'
    );
    await execute(
      'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
      [postId],
      'posts:like:inc'
    );
    res.json({ success: true, data: { liked: true } });
  }
}

export async function addComment(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const postId = Number(req.params.id);
  const body = req.body as { text?: string; body?: string; parent_id?: number };
  const text = (body.text ?? body.body ?? '').trim();
  const parentId = body.parent_id != null ? Number(body.parent_id) : null;

  if (!text) {
    res.status(422).json({ success: false, error: 'Comment text required.' });
    return;
  }

  // Prefer schema column `text`; fall back to `body` for older DBs
  let result = await execute(
    'INSERT INTO post_comments (post_id, user_id, parent_id, text) VALUES (?, ?, ?, ?)',
    [postId, userId, parentId, text],
    'posts:comment'
  );

  if (!result?.insertId) {
    result = await execute(
      'INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)',
      [postId, userId, text],
      'posts:comment:legacy'
    );
  }

  await execute(
    'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?',
    [postId],
    'posts:comment:inc'
  );

  res.status(201).json({
    success: true,
    data: {
      id: result?.insertId,
      post_id: postId,
      user_id: userId,
      parent_id: parentId,
      text,
      created_at: new Date().toISOString(),
    },
  });
}

export async function listComments(req: AuthRequest, res: Response): Promise<void> {
  const postId = Number(req.params.id);
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
     FROM post_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId],
    'posts:comments'
  );
  const flat = rows.map(mapComment);
  res.json({
    success: true,
    data: buildCommentTree(flat),
    meta: { flat },
  });
}
