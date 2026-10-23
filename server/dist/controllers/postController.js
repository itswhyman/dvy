import { execute, queryRows } from '../config/db.js';
function mapPost(r) {
    return {
        id: Number(r.id),
        user_id: Number(r.user_id),
        content: String(r.content),
        image_url: r.image_url ? String(r.image_url) : null,
        likes_count: Number(r.likes_count ?? 0),
        comments_count: Number(r.comments_count ?? 0),
        created_at: new Date(r.created_at).toISOString(),
        author_name: r.author_name ? String(r.author_name) : undefined,
        author_avatar: r.author_avatar != null ? String(r.author_avatar) : null,
        liked_by_me: Boolean(r.liked_by_me),
    };
}
export async function listPosts(req, res) {
    const userId = req.user?.userId ?? 0;
    const rows = await queryRows(`SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_me
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT 50`, [userId], 'posts:list');
    res.json({ success: true, data: rows.map(mapPost) });
}
export async function createPost(req, res) {
    const userId = req.user.userId;
    const { content, image_url } = req.body;
    if (!content?.trim()) {
        res.status(422).json({ success: false, error: 'Content required.' });
        return;
    }
    const result = await execute('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)', [userId, content.trim(), image_url || null], 'posts:create');
    if (!result?.insertId) {
        res.status(503).json({ success: false, error: 'Could not create post.' });
        return;
    }
    const rows = await queryRows(`SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar, 0 AS liked_by_me
     FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`, [result.insertId], 'posts:create:read');
    res.status(201).json({ success: true, data: rows[0] ? mapPost(rows[0]) : null });
}
export async function toggleLike(req, res) {
    const userId = req.user.userId;
    const postId = Number(req.params.id);
    const existing = await queryRows('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId], 'posts:like:check');
    if (existing.length) {
        await execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId], 'posts:unlike');
        await execute('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?', [postId], 'posts:like:dec');
        res.json({ success: true, data: { liked: false } });
    }
    else {
        await execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId], 'posts:like');
        await execute('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId], 'posts:like:inc');
        res.json({ success: true, data: { liked: true } });
    }
}
export async function addComment(req, res) {
    const userId = req.user.userId;
    const postId = Number(req.params.id);
    const { body } = req.body;
    if (!body?.trim()) {
        res.status(422).json({ success: false, error: 'Comment body required.' });
        return;
    }
    const result = await execute('INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)', [postId, userId, body.trim()], 'posts:comment');
    await execute('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId], 'posts:comment:inc');
    res.status(201).json({
        success: true,
        data: {
            id: result?.insertId,
            post_id: postId,
            user_id: userId,
            body: body.trim(),
            created_at: new Date().toISOString(),
        },
    });
}
export async function listComments(req, res) {
    const postId = Number(req.params.id);
    const rows = await queryRows(`SELECT c.*, u.name AS author_name
     FROM post_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`, [postId], 'posts:comments');
    res.json({
        success: true,
        data: rows.map((r) => ({
            id: Number(r.id),
            post_id: Number(r.post_id),
            user_id: Number(r.user_id),
            body: String(r.body),
            author_name: String(r.author_name),
            created_at: new Date(r.created_at).toISOString(),
        })),
    });
}
