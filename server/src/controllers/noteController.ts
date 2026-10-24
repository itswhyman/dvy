import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { summarizeNote } from '../services/aiService.js';
import type { Note } from '../types/index.js';

function mapNote(r: RowDataPacket): Note {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    title: String(r.title),
    content: String(r.content ?? ''),
    template: (r.template as Note['template']) || 'blank',
    category: String(r.category ?? 'general'),
    project_desc: r.project_desc != null ? String(r.project_desc) : null,
    is_archived: Boolean(r.is_archived),
    created_at: new Date(r.created_at as string).toISOString(),
    updated_at: new Date((r.updated_at || r.created_at) as string).toISOString(),
  } as Note;
}

export async function listNotes(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const category = req.query.category as string | undefined;
  const q = req.query.q as string | undefined;
  const archived = req.query.archived === '1';

  let sql = 'SELECT * FROM notes WHERE user_id = ? AND is_archived = ?';
  const params: (string | number | boolean | null)[] = [userId, archived ? 1 : 0];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY updated_at DESC';

  const rows = await queryRows<RowDataPacket[]>(sql, params, 'notes:list');
  res.json({ success: true, data: rows.map(mapNote) });
}

export async function createNote(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title, content, category, template, project_desc } = req.body as {
    title: string;
    content: string;
    category?: string;
    template?: string;
    project_desc?: string;
  };

  if (!title?.trim()) {
    res.status(422).json({ success: false, error: 'Title required.' });
    return;
  }

  let result = await execute(
    `INSERT INTO notes (user_id, title, content, category, template, project_desc) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title.trim().slice(0, 255), content ?? '', category || 'general', template || 'blank', project_desc || null],
    'notes:create'
  );
  if (!result?.insertId) {
    result = await execute(
      `INSERT INTO notes (user_id, title, content, category) VALUES (?, ?, ?, ?)`,
      [userId, title.trim().slice(0, 255), content ?? '', category || 'general'],
      'notes:create:legacy'
    );
  }

  if (!result?.insertId) {
    res.status(503).json({ success: false, error: 'Could not create note.' });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM notes WHERE id = ?',
    [result.insertId],
    'notes:create:read'
  );
  res.status(201).json({ success: true, data: rows[0] ? mapNote(rows[0]) : null });
}

export async function updateNote(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const { title, content, category, is_archived, template, project_desc } = req.body as Partial<Note> & { template?: string; project_desc?: string };

  await execute(
    `UPDATE notes SET
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      category = COALESCE(?, category),
      is_archived = COALESCE(?, is_archived),
      template = COALESCE(?, template),
      project_desc = COALESCE(?, project_desc)
     WHERE id = ? AND user_id = ?`,
    [
      title ?? null,
      content ?? null,
      category ?? null,
      is_archived === undefined ? null : is_archived ? 1 : 0,
      template ?? null,
      project_desc ?? null,
      id,
      userId,
    ],
    'notes:update'
  );

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?',
    [id, userId],
    'notes:update:read'
  );
  res.json({ success: true, data: rows[0] ? mapNote(rows[0]) : null });
}

export async function deleteNote(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  await execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId], 'notes:delete');
  res.json({ success: true, message: 'Deleted.' });
}

export async function summarize(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?',
    [id, userId],
    'notes:sum'
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Note not found.' });
    return;
  }
  const summary = await summarizeNote(String(rows[0].content ?? ''));
  res.json({ success: true, data: { summary } });
}
