import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { rateTodoWithAi } from '../services/aiService.js';
import type { Todo, TodoPriority, TodoStatus } from '../types/index.js';

const FALLBACK_TODOS: Todo[] = [];

function mapTodo(r: RowDataPacket): Todo {
  const rawPriority = r.priority;
  let priority: TodoPriority | number = rawPriority as TodoPriority;
  if (typeof rawPriority === 'number' || (typeof rawPriority === 'string' && !Number.isNaN(Number(rawPriority)) && !['low','medium','high','ai_suggested'].includes(String(rawPriority)))) {
    priority = Number(rawPriority) as unknown as TodoPriority;
  }
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    title: String(r.title),
    description: r.description != null ? String(r.description) : null,
    notes: r.notes != null ? String(r.notes) : null,
    priority: priority as TodoPriority,
    ai_score: r.ai_score != null ? Number(r.ai_score) : null,
    status: r.status as TodoStatus,
    due_date: (r.due_date || r.due_at) ? String(r.due_date || r.due_at).slice(0, 19).replace('T', ' ') : null,
    sort_order: Number(r.sort_order ?? 0),
    created_at: new Date(r.created_at as string).toISOString(),
    sub_todos: Array.isArray((r as any).sub_todos) ? (r as any).sub_todos : undefined,
  } as Todo;
}

export async function listTodos(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;

  let sql = 'SELECT * FROM todos WHERE user_id = ?';
  const params: (string | number | boolean | null)[] = [userId];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }
  sql += ' ORDER BY sort_order ASC, created_at DESC';

  const rows = await queryRows<RowDataPacket[]>(sql, params, 'todos:list');
  res.json({
    success: true,
    data: rows.length ? rows.map(mapTodo) : FALLBACK_TODOS,
  });
}

export async function createTodo(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title, description, priority, due_date } = req.body as {
    title: string;
    description?: string;
    priority?: TodoPriority;
    due_date?: string;
  };

  if (!title?.trim()) {
    res.status(422).json({ success: false, error: 'Title is required.' });
    return;
  }

  const result = await execute(
    `INSERT INTO todos (user_id, title, description, priority, due_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      title.trim().slice(0, 255),
      description?.trim() || null,
      priority || 'medium',
      due_date || null,
    ],
    'todos:create'
  );

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
  const { title, description, priority, status, due_date, sort_order } = req.body as Partial<Todo>;

  await execute(
    `UPDATE todos SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      due_date = COALESCE(?, due_date),
      sort_order = COALESCE(?, sort_order)
     WHERE id = ? AND user_id = ?`,
    [
      title ?? null,
      description ?? null,
      priority ?? null,
      status ?? null,
      due_date ?? null,
      sort_order ?? null,
      id,
      userId,
    ],
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

  await execute(
    'UPDATE todos SET ai_score = ?, priority = ? WHERE id = ? AND user_id = ?',
    [result.score, result.priority, id, userId],
    'todos:ai:save'
  );

  res.json({
    success: true,
    data: {
      ...todo,
      ai_score: result.score,
      priority: result.priority,
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
