import { execute, queryRows } from '../config/db.js';
import { rateTodoWithAi } from '../services/aiService.js';
const FALLBACK_TODOS = [];
function mapTodo(r) {
    return {
        id: Number(r.id),
        user_id: Number(r.user_id),
        title: String(r.title),
        description: r.description != null ? String(r.description) : null,
        priority: r.priority,
        ai_score: r.ai_score != null ? Number(r.ai_score) : null,
        status: r.status,
        due_date: r.due_date ? String(r.due_date).slice(0, 10) : null,
        sort_order: Number(r.sort_order ?? 0),
        created_at: new Date(r.created_at).toISOString(),
    };
}
export async function listTodos(req, res) {
    const userId = req.user.userId;
    const status = req.query.status;
    const priority = req.query.priority;
    let sql = 'SELECT * FROM todos WHERE user_id = ?';
    const params = [userId];
    if (status) {
        sql += ' AND status = ?';
        params.push(status);
    }
    if (priority) {
        sql += ' AND priority = ?';
        params.push(priority);
    }
    sql += ' ORDER BY sort_order ASC, created_at DESC';
    const rows = await queryRows(sql, params, 'todos:list');
    res.json({
        success: true,
        data: rows.length ? rows.map(mapTodo) : FALLBACK_TODOS,
    });
}
export async function createTodo(req, res) {
    const userId = req.user.userId;
    const { title, description, priority, due_date } = req.body;
    if (!title?.trim()) {
        res.status(422).json({ success: false, error: 'Title is required.' });
        return;
    }
    const result = await execute(`INSERT INTO todos (user_id, title, description, priority, due_date)
     VALUES (?, ?, ?, ?, ?)`, [
        userId,
        title.trim().slice(0, 255),
        description?.trim() || null,
        priority || 'medium',
        due_date || null,
    ], 'todos:create');
    if (!result?.insertId) {
        res.status(503).json({ success: false, error: 'Could not create todo.', data: null });
        return;
    }
    const rows = await queryRows('SELECT * FROM todos WHERE id = ?', [result.insertId], 'todos:create:read');
    res.status(201).json({
        success: true,
        data: rows[0] ? mapTodo(rows[0]) : null,
    });
}
export async function updateTodo(req, res) {
    const userId = req.user.userId;
    const id = Number(req.params.id);
    const { title, description, priority, status, due_date, sort_order } = req.body;
    await execute(`UPDATE todos SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      due_date = COALESCE(?, due_date),
      sort_order = COALESCE(?, sort_order)
     WHERE id = ? AND user_id = ?`, [
        title ?? null,
        description ?? null,
        priority ?? null,
        status ?? null,
        due_date ?? null,
        sort_order ?? null,
        id,
        userId,
    ], 'todos:update');
    const rows = await queryRows('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, userId], 'todos:update:read');
    res.json({ success: true, data: rows[0] ? mapTodo(rows[0]) : null });
}
export async function deleteTodo(req, res) {
    const userId = req.user.userId;
    const id = Number(req.params.id);
    await execute('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId], 'todos:delete');
    res.json({ success: true, message: 'Deleted.' });
}
export async function reorderTodos(req, res) {
    const userId = req.user.userId;
    const items = req.body;
    if (!Array.isArray(items)) {
        res.status(422).json({ success: false, error: 'Expected array of items.' });
        return;
    }
    for (const item of items) {
        await execute('UPDATE todos SET status = ?, sort_order = ? WHERE id = ? AND user_id = ?', [item.status, item.sort_order, item.id, userId], 'todos:reorder');
    }
    res.json({ success: true, message: 'Reordered.' });
}
export async function rateWithAi(req, res) {
    const userId = req.user.userId;
    const id = Number(req.params.id);
    const rows = await queryRows('SELECT * FROM todos WHERE id = ? AND user_id = ?', [id, userId], 'todos:ai:read');
    if (!rows.length) {
        res.status(404).json({ success: false, error: 'Todo not found.' });
        return;
    }
    const todo = mapTodo(rows[0]);
    const result = await rateTodoWithAi(todo.title, todo.description);
    await execute('UPDATE todos SET ai_score = ?, priority = ? WHERE id = ? AND user_id = ?', [result.score, result.priority, id, userId], 'todos:ai:save');
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
