import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function listUsers(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT id, email, name, role, avatar_url, bio, status, created_at
     FROM users ORDER BY created_at DESC`,
    [],
    'admin:users'
  );
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      email: String(r.email),
      name: String(r.name),
      role: String(r.role),
      avatar_url: r.avatar_url ? String(r.avatar_url) : null,
      bio: r.bio ? String(r.bio) : null,
      status: String(r.status),
      created_at: new Date(r.created_at as string).toISOString(),
    })),
  });
}

export async function updateUserRole(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { role } = req.body as { role: string };
  if (!['admin', 'user', 'pro_user'].includes(role)) {
    res.status(422).json({ success: false, error: 'Invalid role.' });
    return;
  }
  await execute('UPDATE users SET role = ? WHERE id = ?', [role, id], 'admin:role');
  res.json({ success: true, message: 'Role updated.' });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (id === req.user!.userId) {
    res.status(400).json({ success: false, error: 'Cannot delete yourself.' });
    return;
  }
  await execute('DELETE FROM users WHERE id = ?', [id], 'admin:delete');
  res.json({ success: true, message: 'User deleted.' });
}

export async function getSettings(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT setting_key, setting_value FROM system_settings',
    [],
    'admin:settings'
  );
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[String(r.setting_key)] = String(r.setting_value);
  }
  res.json({ success: true, data: settings });
}

export async function updateSetting(req: AuthRequest, res: Response): Promise<void> {
  const { key, value } = req.body as { key: string; value: string };
  if (!key) {
    res.status(422).json({ success: false, error: 'key required.' });
    return;
  }
  await execute(
    `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, String(value ?? '')],
    'admin:setting'
  );
  res.json({ success: true, message: 'Setting saved.' });
}

export async function dashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  const [users, todos, posts, messages] = await Promise.all([
    queryRows<RowDataPacket[]>('SELECT COUNT(*) AS c FROM users', [], 'admin:c:users'),
    queryRows<RowDataPacket[]>('SELECT COUNT(*) AS c FROM todos', [], 'admin:c:todos'),
    queryRows<RowDataPacket[]>('SELECT COUNT(*) AS c FROM posts', [], 'admin:c:posts'),
    queryRows<RowDataPacket[]>('SELECT COUNT(*) AS c FROM messages', [], 'admin:c:msg'),
  ]);

  res.json({
    success: true,
    data: {
      users: Number(users[0]?.c ?? 0),
      todos: Number(todos[0]?.c ?? 0),
      posts: Number(posts[0]?.c ?? 0),
      messages: Number(messages[0]?.c ?? 0),
    },
  });
}

export async function listLogs(req: AuthRequest, res: Response): Promise<void> {
  const { listLogs: queryLogs, getLogStats } = await import('../services/loggerService.js');
  const level = req.query.level as string | undefined;
  const category = req.query.category as string | undefined;
  const statusCode = req.query.statusCode
    ? Number(req.query.statusCode)
    : undefined;
  const q = (req.query.q as string) || undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = queryLogs({
    level: level as 'info' | 'warn' | 'error' | 'debug' | undefined,
    category: category as
      | 'http'
      | 'api'
      | 'db'
      | 'socket'
      | 'auth'
      | 'system'
      | 'billing'
      | undefined,
    statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
    q,
    limit,
    offset,
  });

  res.json({
    success: true,
    data: {
      ...result,
      stats: getLogStats(),
    },
  });
}

export async function clearSystemLogs(_req: AuthRequest, res: Response): Promise<void> {
  const { clearLogs } = await import('../services/loggerService.js');
  const n = clearLogs();
  res.json({ success: true, message: `Cleared ${n} log entries.` });
}
