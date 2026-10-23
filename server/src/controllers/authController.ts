import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import { signToken, type AuthRequest } from '../middleware/auth.js';
import type { User, UserRole } from '../types/index.js';

export const registerValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name required'),
];

export const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function mapUser(r: RowDataPacket): User {
  return {
    id: Number(r.id),
    email: String(r.email),
    name: String(r.name),
    role: r.role as UserRole,
    avatar_url: r.avatar_url ? String(r.avatar_url) : null,
    bio: r.bio ? String(r.bio) : null,
    status: r.status as User['status'],
    created_at: new Date(r.created_at as string).toISOString(),
  };
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, error: 'Validation failed', data: errors.array() });
    return;
  }

  const { email, password, name } = req.body as {
    email: string;
    password: string;
    name: string;
  };

  try {
    const existing = await queryRows<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
      'auth:register:check'
    );
    if (existing.length) {
      res.status(409).json({ success: false, error: 'Email already registered.' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'user')`,
      [email, hash, name],
      'auth:register'
    );

    if (!result?.insertId) {
      res.status(503).json({ success: false, error: 'Could not create account. Try again.' });
      return;
    }

    await execute(
      `INSERT INTO subscriptions (user_id, plan_type, status) VALUES (?, 'free', 'active')`,
      [result.insertId],
      'auth:sub'
    );

    const token = signToken({
      userId: result.insertId,
      email,
      role: 'user',
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.insertId,
          email,
          name,
          role: 'user' as UserRole,
          avatar_url: null,
          bio: null,
          status: 'offline' as const,
          created_at: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, error: 'Registration failed.' });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, error: 'Validation failed' });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email],
    'auth:login'
  );

  if (!rows.length) {
    res.status(401).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  const row = rows[0];
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) {
    res.status(401).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  const user = mapUser(row);
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({ success: true, data: { token, user } });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT id, email, name, role, avatar_url, bio, status, created_at FROM users WHERE id = ? LIMIT 1',
    [req.user.userId],
    'auth:me'
  );

  if (!rows.length) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: mapUser(rows[0]) });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { name, bio, avatar_url } = req.body as {
    name?: string;
    bio?: string;
    avatar_url?: string;
  };

  await execute(
    `UPDATE users SET
      name = COALESCE(?, name),
      bio = COALESCE(?, bio),
      avatar_url = COALESCE(?, avatar_url)
     WHERE id = ?`,
    [name ?? null, bio ?? null, avatar_url ?? null, req.user.userId],
    'auth:profile'
  );

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT id, email, name, role, avatar_url, bio, status, created_at FROM users WHERE id = ?',
    [req.user.userId],
    'auth:profile:read'
  );

  res.json({
    success: true,
    data: rows[0] ? mapUser(rows[0]) : null,
  });
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!newPassword || newPassword.length < 8) {
    res.status(422).json({ success: false, error: 'New password min 8 characters.' });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.userId],
    'auth:pw'
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const ok = await bcrypt.compare(currentPassword, String(rows[0].password_hash));
  if (!ok) {
    res.status(401).json({ success: false, error: 'Current password incorrect.' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.userId], 'auth:pw:set');
  res.json({ success: true, message: 'Password updated.' });
}
