import { parseJson, queryRows } from '../config/db.js';
import { getOnlineUserIds, getPresenceList } from '../services/socket.js';
function mapMessage(r) {
    return {
        id: Number(r.id),
        sender_id: Number(r.sender_id),
        receiver_id: r.receiver_id != null ? Number(r.receiver_id) : null,
        group_id: r.group_id != null ? Number(r.group_id) : null,
        text: String(r.text),
        attachments_json: parseJson(r.attachments_json, null),
        is_read: Boolean(r.is_read),
        created_at: new Date(r.created_at).toISOString(),
        sender_name: r.sender_name ? String(r.sender_name) : undefined,
    };
}
export async function listDm(req, res) {
    const userId = req.user.userId;
    const peerId = Number(req.params.peerId);
    const rows = await queryRows(`SELECT m.*, u.name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.group_id IS NULL
       AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
     ORDER BY m.created_at ASC
     LIMIT 200`, [userId, peerId, peerId, userId], 'messages:dm');
    res.json({ success: true, data: rows.map(mapMessage) });
}
export async function listContacts(req, res) {
    const userId = req.user.userId;
    const rows = await queryRows(`SELECT id, name, email, avatar_url, status, role
     FROM users WHERE id != ?
     ORDER BY name ASC`, [userId], 'messages:contacts');
    const online = new Set(getOnlineUserIds());
    res.json({
        success: true,
        data: rows.map((r) => ({
            id: Number(r.id),
            name: String(r.name),
            email: String(r.email),
            avatar_url: r.avatar_url ? String(r.avatar_url) : null,
            status: online.has(Number(r.id)) ? 'online' : String(r.status),
            role: String(r.role),
        })),
    });
}
export async function presence(_req, res) {
    const list = await getPresenceList();
    res.json({ success: true, data: list });
}
