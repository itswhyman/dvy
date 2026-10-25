import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { rateTodoWithAi } from '../services/aiService.js';
import type { Todo, TodoStatus } from '../types/index.js';

const FALLBACK_TODOS: Todo[] = [];

/** Normalize any incoming priority (legacy string or number) to 0.0–5.0 step 0.5 */
function normalizePriority(raw: unknown, fallback = 0): number {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const clamped = Math.max(0, Math.min(5, raw));
    return Math.round(clamped * 2) / 2; // force 0.5 steps
  }
  const s = String(raw).toLowerCase().trim();
  if (s === 'high' || s === 'ai_suggested') return 4.5;
  if (s === 'medium') return 3.0;
  if (s === 'low') return 1.5;
  const n = Number(s);
  if (!Number.isNaN(n)) {
    const clamped = Math.max(0, Math.min(5, n));
    return Math.round(clamped * 2) / 2;
  }
  return fallback;
}

function mapTodo(r: RowDataPacket): Todo {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    team_id: r.team_id != null ? Number(r.team_id) : null,
    assignee_id: r.assignee_id != null ? Number(r.assignee_id) : null,
    title: String(r.title),
    description: r.description != null ? String(r.description) : null,
    notes: r.notes != null ? String(r.notes) : null,
    sticker: r.sticker != null ? String(r.sticker) : null,
    priority: normalizePriority(r.priority, 0),
    ai_score: r.ai_score != null ? Number(r.ai_score) : null,
    status: r.status as TodoStatus,
    due_at: r.due_at
      ? String(r.due_at).slice(0, 19).replace('T', ' ')
      : null,
    sort_order: Number(r.sort_order ?? 0),
    completed_at: r.completed_at
      ? new Date(r.completed_at as string).toISOString()
      : null,
    created_at: new Date(r.created_at as string).toISOString(),
    updated_at: r.updated_at
      ? new Date(r.updated_at as string).toISOString()
      : undefined,
    sub_todos: Array.isArray((r as any).sub_todos)
      ? (r as any).sub_todos
      : undefined,
  };
}

export async function listTodos(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const status = req.query.status as string | undefined;
  const minPriority = req.query.min_priority as string | undefined;
  const includeSubs = String(req.query.include || '').includes('subs');
  const sort = (req.query.sort as string) || 'order'; // order | priority | created | due

  let sql = 'SELECT * FROM todos WHERE user_id = ?';
  const params: (string | number | boolean | null)[] = [userId];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (minPriority != null && minPriority !== '') {
    sql += ' AND priority >= ?';
    params.push(normalizePriority(minPriority, 0));
  }

  switch (sort) {
    case 'priority':
      sql += ' ORDER BY priority DESC, sort_order ASC, created_at DESC';
      break;
    case 'created':
      sql += ' ORDER BY created_at DESC';
      break;
    case 'due':
      sql += ' ORDER BY due_at IS NULL, due_at ASC, sort_order ASC';
      break;
    default:
      sql += ' ORDER BY sort_order ASC, created_at DESC';
  }

  const rows = await queryRows<RowDataPacket[]>(sql, params, 'todos:list');
  const todos = rows.map(mapTodo);

  if (includeSubs && todos.length) {
    const ids = todos.map((t) => t.id);
    const placeholders = ids.map(() => '?').join(',');
    const subRows = await queryRows<RowDataPacket[]>(
      `SELECT * FROM sub_todos WHERE todo_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
      ids,
      'todos:list:subs'
    );
    const byTodo = new Map<number, typeof subRows>();
    for (const s of subRows) {
      const tid = Number(s.todo_id);
      if (!byTodo.has(tid)) byTodo.set(tid, []);
      byTodo.get(tid)!.push(s);
    }
    for (const t of todos) {
      const subs = byTodo.get(t.id) || [];
      t.sub_todos = subs.map((r) => ({
        id: Number(r.id),
        todo_id: Number(r.todo_id),
        parent_id: r.parent_id != null ? Number(r.parent_id) : null,
        title: String(r.title),
        is_done: Boolean(r.is_done),
        sort_order: Number(r.sort_order ?? 0),
        assignee_id: r.assignee_id != null ? Number(r.assignee_id) : null,
        created_at: new Date(r.created_at as string).toISOString(),
      }));
    }
  }

  res.json({
    success: true,
    data: todos.length ? todos : FALLBACK_TODOS,
  });
}

export async function createTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const {
    title,
    description,
    notes,
    sticker,
    priority,
    due_at,
    due_date, // legacy alias
    status,
    team_id,
  } = req.body as {
    title: string;
    description?: string;
    notes?: string;
    sticker?: string;
    priority?: number | string;
    due_at?: string;
    due_date?: string;
    status?: TodoStatus;
    team_id?: number;
  };

  if (!title?.trim()) {
    res.status(422).json({ success: false, error: 'Title is required.' });
    return;
  }

  const prio = normalizePriority(priority, 0);
  const due = due_at || due_date || null;

  let result = await execute(
    `INSERT INTO todos (user_id, team_id, title, description, notes, sticker, priority, due_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      team_id ?? null,
      title.trim().slice(0, 255),
      description?.trim() || null,
      notes?.trim() || null,
      sticker?.trim()?.slice(0, 64) || null,
      prio,
      due,
      status && ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
        ? status
        : 'pending',
    ],
    'todos:create'
  );

  // Fallback when sticker column not yet migrated on existing DBs
  if (!result?.insertId) {
    result = await execute(
      `INSERT INTO todos (user_id, title, description, notes, priority, due_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim().slice(0, 255),
        description?.trim() || null,
        notes?.trim() || null,
        prio,
        due,
        status && ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
          ? status
          : 'pending',
      ],
      'todos:create:legacy'
    );
  }

  if (!result?.insertId) {
    res.status(503).json({ success: false, error: 'Could not create todo.', data: null });
    return;
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM todos WHERE id = ?',
    [result.insertId],
    'todos:create:read'
  );

  res.status(201).json({
    success: true,
    data: rows[0] ? mapTodo(rows[0]) : null,
  });
}

export async function updateTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const body = req.body as Partial<Todo> & { due_date?: string };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.title != null) {
    sets.push('title = ?');
    params.push(String(body.title).trim().slice(0, 255));
  }
  if (body.description !== undefined) {
    sets.push('description = ?');
    params.push(body.description == null ? null : String(body.description).trim());
  }
  if (body.notes !== undefined) {
    sets.push('notes = ?');
    params.push(body.notes == null ? null : String(body.notes).trim());
  }
  if (body.sticker !== undefined) {
    sets.push('sticker = ?');
    params.push(
      body.sticker == null ? null : String(body.sticker).trim().slice(0, 64)
    );
  }
  if (body.priority !== undefined) {
    sets.push('priority = ?');
    params.push(normalizePriority(body.priority, 0));
  }
  if (
    body.status &&
    ['pending', 'in_progress', 'completed', 'cancelled'].includes(body.status)
  ) {
    sets.push('status = ?');
    params.push(body.status);
    if (body.status === 'completed') {
      sets.push('completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP(3))');
    } else {
      sets.push('completed_at = NULL');
    }
  }
  const dueAt = body.due_at ?? body.due_date;
  if (dueAt !== undefined) {
    sets.push('due_at = ?');
    params.push(dueAt || null);
  }
  if (body.sort_order != null) {
    sets.push('sort_order = ?');
    params.push(Number(body.sort_order));
  }

  if (sets.length === 0) {
    res.status(422).json({ success: false, error: 'No valid fields to update.' });
    return;
  }

  params.push(id, userId);
  await execute(
    `UPDATE todos SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    params,
    'todos:update'
  );

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM todos WHERE id = ? AND user_id = ?',
    [id, userId],
    'todos:update:read'
  );

  res.json({ success: true, data: rows[0] ? mapTodo(rows[0]) : null });
}

export async function deleteTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  await execute('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId], 'todos:delete');
  res.json({ success: true, message: 'Deleted.' });
}

export async function reorderTodos(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const items = req.body as { id: number; status: TodoStatus; sort_order: number }[];
  if (!Array.isArray(items)) {
    res.status(422).json({ success: false, error: 'Expected array of items.' });
    return;
  }

  for (const item of items) {
    await execute(
      'UPDATE todos SET status = ?, sort_order = ? WHERE id = ? AND user_id = ?',
      [item.status, item.sort_order, item.id, userId],
      'todos:reorder'
    );
  }

  res.json({ success: true, message: 'Reordered.' });
}

export async function rateWithAi(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = Number(req.params.id);

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM todos WHERE id = ? AND user_id = ?',
    [id, userId],
    'todos:ai:read'
  );

  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Todo not found.' });
    return;
  }

  const todo = mapTodo(rows[0]);
  const result = await rateTodoWithAi(todo.title, todo.description);

  // Map 0-100 AI score → 0.0–5.0 star rating
  const starPriority = Math.round((result.score / 100) * 10) / 2; // 0, 0.5, … 5.0

  await execute(
    'UPDATE todos SET ai_score = ?, priority = ? WHERE id = ? AND user_id = ?',
    [result.score, starPriority, id, userId],
    'todos:ai:save'
  );

  res.json({
    success: true,
    data: {
      ...todo,
      ai_score: result.score,
      priority: starPriority,
      rationale: result.rationale,
    },
  });
}


// ── Sub-todos ───────────────────────────────────────────────
export async function listSubTodos(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const todoId = Number(req.params.id);
  const owned = await queryRows<RowDataPacket[]>(
    'SELECT id FROM todos WHERE id = ? AND user_id = ?',
    [todoId, userId],
    'subtodos:own'
  );
  if (!owned.length) {
    res.status(404).json({ success: false, error: 'Todo not found.' });
    return;
  }
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM sub_todos WHERE todo_id = ? ORDER BY sort_order ASC, id ASC',
    [todoId],
    'subtodos:list'
  );
  res.json({
    success: true,
    data: rows.map((r) => ({
      id: Number(r.id),
      todo_id: Number(r.todo_id),
      parent_id: r.parent_id != null ? Number(r.parent_id) : null,
      title: String(r.title),
      is_done: Boolean(r.is_done),
      sort_order: Number(r.sort_order ?? 0),
      assignee_id: r.assignee_id != null ? Number(r.assignee_id) : null,
      created_at: new Date(r.created_at as string).toISOString(),
    })),
  });
}

export async function createSubTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const todoId = Number(req.params.id);
  const { title, parent_id } = req.body as { title: string; parent_id?: number };
  if (!title?.trim()) {
    res.status(422).json({ success: false, error: 'Title required.' });
    return;
  }
  const owned = await queryRows<RowDataPacket[]>(
    'SELECT id FROM todos WHERE id = ? AND user_id = ?',
    [todoId, userId],
    'subtodos:own'
  );
  if (!owned.length) {
    res.status(404).json({ success: false, error: 'Todo not found.' });
    return;
  }
  const result = await execute(
    'INSERT INTO sub_todos (todo_id, parent_id, title) VALUES (?, ?, ?)',
    [todoId, parent_id ?? null, title.trim().slice(0, 255)],
    'subtodos:create'
  );
  res.status(201).json({
    success: true,
    data: {
      id: result?.insertId,
      todo_id: todoId,
      parent_id: parent_id ?? null,
      title: title.trim(),
      is_done: false,
      sort_order: 0,
      created_at: new Date().toISOString(),
    },
  });
}

export async function updateSubTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const todoId = Number(req.params.id);
  const subId = Number(req.params.subId);
  const { title, is_done, sort_order } = req.body as {
    title?: string;
    is_done?: boolean;
    sort_order?: number;
  };
  const owned = await queryRows<RowDataPacket[]>(
    'SELECT id FROM todos WHERE id = ? AND user_id = ?',
    [todoId, userId],
    'subtodos:own'
  );
  if (!owned.length) {
    res.status(404).json({ success: false, error: 'Todo not found.' });
    return;
  }
  await execute(
    `UPDATE sub_todos SET
      title = COALESCE(?, title),
      is_done = COALESCE(?, is_done),
      sort_order = COALESCE(?, sort_order)
     WHERE id = ? AND todo_id = ?`,
    [title ?? null, is_done == null ? null : is_done ? 1 : 0, sort_order ?? null, subId, todoId],
    'subtodos:update'
  );
  res.json({ success: true, message: 'Updated.' });
}

export async function deleteSubTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const todoId = Number(req.params.id);
  const subId = Number(req.params.subId);
  const owned = await queryRows<RowDataPacket[]>(
    'SELECT id FROM todos WHERE id = ? AND user_id = ?',
    [todoId, userId],
    'subtodos:own'
  );
  if (!owned.length) {
    res.status(404).json({ success: false, error: 'Todo not found.' });
    return;
  }
  await execute('DELETE FROM sub_todos WHERE id = ? AND todo_id = ?', [subId, todoId], 'subtodos:delete');
  res.json({ success: true, message: 'Deleted.' });
}

export async function todoStats(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS c FROM todos WHERE user_id = ? GROUP BY status`,
    [userId],
    'todos:stats'
  );
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[String(r.status)] = Number(r.c);
    total += Number(r.c);
  }
  const completed = byStatus.completed || 0;
  res.json({
    success: true,
    data: {
      total,
      byStatus,
      completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
    },
  });
}
