import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { Board } from '../types/index.js';

function mapBoard(r: RowDataPacket): Board {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    title: String(r.title),
    canvas_data_json: String(r.canvas_data_json ?? '{"version":1,"objects":[]}'),
    created_at: new Date(r.created_at as string).toISOString(),
    updated_at: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
  };
}

export async function listBoards(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM boards WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
    'boards:list'
  );
  res.json({ success: true, data: rows.map(mapBoard) });
}

export async function getBoard(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM boards WHERE id = ? AND user_id = ?',
    [id, userId],
    'boards:get'
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Board not found.' });
    return;
  }
  res.json({ success: true, data: mapBoard(rows[0]) });
}

export async function createBoard(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title, canvas_data_json } = req.body as {
    title: string;
    canvas_data_json?: string;
  };

  if (!title?.trim()) {
    res.status(422).json({ success: false, error: 'Title required.' });
    return;
  }

  const json =
    canvas_data_json ||
    JSON.stringify({ version: 1, objects: [] });

  const result = await execute(
    'INSERT INTO boards (user_id, title, canvas_data_json) VALUES (?, ?, ?)',
    [userId, title.trim().slice(0, 200), json],
    'boards:create'
  );

  if (!result?.insertId) {
    res.status(503).json({ success: false, error: 'Could not create board.' });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM boards WHERE id = ?',
    [result.insertId],
    'boards:create:read'
  );
  res.status(201).json({ success: true, data: rows[0] ? mapBoard(rows[0]) : null });
}

export async function updateBoard(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const { title, canvas_data_json } = req.body as {
    title?: string;
    canvas_data_json?: string;
  };

  await execute(
    `UPDATE boards SET
      title = COALESCE(?, title),
      canvas_data_json = COALESCE(?, canvas_data_json)
     WHERE id = ? AND user_id = ?`,
    [title ?? null, canvas_data_json ?? null, id, userId],
    'boards:update'
  );

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM boards WHERE id = ? AND user_id = ?',
    [id, userId],
    'boards:update:read'
  );
  res.json({ success: true, data: rows[0] ? mapBoard(rows[0]) : null });
}

export async function deleteBoard(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  await execute('DELETE FROM boards WHERE id = ? AND user_id = ?', [id, userId], 'boards:delete');
  res.json({ success: true, message: 'Deleted.' });
}
