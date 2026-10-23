import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as todos from '../controllers/todoController.js';
import * as notes from '../controllers/noteController.js';
import * as boards from '../controllers/boardController.js';
import * as posts from '../controllers/postController.js';
import * as messages from '../controllers/messageController.js';
import * as teams from '../controllers/teamController.js';
import * as payments from '../controllers/paymentController.js';
import * as admin from '../controllers/adminController.js';
const router = Router();
// ── Auth  (final: /api/auth/*) ──────────────────────────────
router.post('/auth/register', auth.registerValidators, auth.register);
router.post('/auth/login', auth.loginValidators, auth.login);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/profile', requireAuth, auth.updateProfile);
router.post('/auth/password', requireAuth, auth.changePassword);
// ── Todos ───────────────────────────────────────────────────
router.get('/todos', requireAuth, todos.listTodos);
router.post('/todos', requireAuth, todos.createTodo);
router.patch('/todos/:id', requireAuth, todos.updateTodo);
router.delete('/todos/:id', requireAuth, todos.deleteTodo);
router.post('/todos/reorder', requireAuth, todos.reorderTodos);
router.post('/todos/:id/ai-rate', requireAuth, todos.rateWithAi);
// ── Notes ───────────────────────────────────────────────────
router.get('/notes', requireAuth, notes.listNotes);
router.post('/notes', requireAuth, notes.createNote);
router.patch('/notes/:id', requireAuth, notes.updateNote);
router.delete('/notes/:id', requireAuth, notes.deleteNote);
router.post('/notes/:id/summarize', requireAuth, notes.summarize);
// ── Boards ──────────────────────────────────────────────────
router.get('/boards', requireAuth, boards.listBoards);
router.get('/boards/:id', requireAuth, boards.getBoard);
router.post('/boards', requireAuth, boards.createBoard);
router.patch('/boards/:id', requireAuth, boards.updateBoard);
router.delete('/boards/:id', requireAuth, boards.deleteBoard);
// ── Posts / Feed ────────────────────────────────────────────
router.get('/posts', requireAuth, posts.listPosts);
router.post('/posts', requireAuth, posts.createPost);
router.post('/posts/:id/like', requireAuth, posts.toggleLike);
router.get('/posts/:id/comments', requireAuth, posts.listComments);
router.post('/posts/:id/comments', requireAuth, posts.addComment);
// ── Messages ────────────────────────────────────────────────
router.get('/messages/contacts', requireAuth, messages.listContacts);
router.get('/messages/dm/:peerId', requireAuth, messages.listDm);
router.get('/messages/presence', requireAuth, messages.presence);
// ── Teams ───────────────────────────────────────────────────
router.get('/teams', requireAuth, teams.listTeams);
router.get('/teams/:id', requireAuth, teams.getTeam);
router.post('/teams', requireAuth, teams.createTeam);
router.get('/analytics', requireAuth, teams.analytics);
// ── Billing ─────────────────────────────────────────────────
router.get('/billing/subscription', requireAuth, payments.getSubscription);
router.post('/billing/checkout', requireAuth, payments.createCheckout);
router.post('/billing/webhook', payments.webhook);
// ── Admin ───────────────────────────────────────────────────
router.get('/admin/users', requireAuth, requireRole('admin'), admin.listUsers);
router.patch('/admin/users/:id/role', requireAuth, requireRole('admin'), admin.updateUserRole);
router.delete('/admin/users/:id', requireAuth, requireRole('admin'), admin.deleteUser);
router.get('/admin/settings', requireAuth, requireRole('admin'), admin.getSettings);
router.post('/admin/settings', requireAuth, requireRole('admin'), admin.updateSetting);
router.get('/admin/stats', requireAuth, requireRole('admin'), admin.dashboardStats);
router.get('/admin/logs', requireAuth, requireRole('admin'), admin.listLogs);
router.delete('/admin/logs', requireAuth, requireRole('admin'), admin.clearSystemLogs);
// ── Public settings ─────────────────────────────────────────
router.get('/settings/public', async (_req, res) => {
    try {
        const { queryRows } = await import('../config/db.js');
        const rows = await queryRows(`SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('announcement_banner', 'maintenance_mode')`, [], 'settings:public');
        const data = {};
        for (const r of rows) {
            data[r.setting_key] = r.setting_value;
        }
        res.json({ success: true, data });
    }
    catch {
        res.json({
            success: true,
            data: { announcement_banner: '', maintenance_mode: 'false' },
        });
    }
});
export default router;
