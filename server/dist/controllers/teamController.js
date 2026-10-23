import { execute, parseJson, queryRows } from '../config/db.js';
function mapTeam(r) {
    return {
        id: Number(r.id),
        team_name: String(r.team_name),
        lead_user_id: Number(r.lead_user_id),
        performance_score: Number(r.performance_score ?? 0),
        metrics_json: parseJson(r.metrics_json, null),
        created_at: new Date(r.created_at).toISOString(),
    };
}
export async function listTeams(_req, res) {
    const rows = await queryRows('SELECT * FROM teams ORDER BY performance_score DESC', [], 'teams:list');
    res.json({ success: true, data: rows.map(mapTeam) });
}
export async function getTeam(req, res) {
    const id = Number(req.params.id);
    const rows = await queryRows('SELECT * FROM teams WHERE id = ?', [id], 'teams:get');
    if (!rows.length) {
        res.status(404).json({ success: false, error: 'Team not found.' });
        return;
    }
    const members = await queryRows(`SELECT tm.*, u.name, u.email, u.avatar_url, u.status
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?`, [id], 'teams:members');
    res.json({
        success: true,
        data: {
            ...mapTeam(rows[0]),
            members: members.map((m) => ({
                id: Number(m.user_id),
                name: String(m.name),
                email: String(m.email),
                avatar_url: m.avatar_url ? String(m.avatar_url) : null,
                role_in_team: String(m.role_in_team),
                status: String(m.status),
                joined_at: new Date(m.joined_at).toISOString(),
            })),
        },
    });
}
export async function createTeam(req, res) {
    const userId = req.user.userId;
    const { team_name } = req.body;
    if (!team_name?.trim()) {
        res.status(422).json({ success: false, error: 'Team name required.' });
        return;
    }
    const result = await execute(`INSERT INTO teams (team_name, lead_user_id, performance_score, metrics_json)
     VALUES (?, ?, 0, ?)`, [
        team_name.trim(),
        userId,
        JSON.stringify({ completed_week: 0, wip: 0, velocity: 0 }),
    ], 'teams:create');
    if (!result?.insertId) {
        res.status(503).json({ success: false, error: 'Could not create team.' });
        return;
    }
    await execute('INSERT INTO team_members (team_id, user_id, role_in_team) VALUES (?, ?, ?)', [result.insertId, userId, 'lead'], 'teams:member');
    const rows = await queryRows('SELECT * FROM teams WHERE id = ?', [result.insertId], 'teams:create:read');
    res.status(201).json({ success: true, data: rows[0] ? mapTeam(rows[0]) : null });
}
export async function analytics(_req, res) {
    const todoStats = await queryRows(`SELECT status, COUNT(*) AS cnt FROM todos GROUP BY status`, [], 'analytics:todos');
    const teams = await queryRows('SELECT id, team_name, performance_score, metrics_json FROM teams ORDER BY performance_score DESC', [], 'analytics:teams');
    const userCount = await queryRows('SELECT COUNT(*) AS cnt FROM users', [], 'analytics:users');
    res.json({
        success: true,
        data: {
            todos_by_status: Object.fromEntries(todoStats.map((r) => [String(r.status), Number(r.cnt)])),
            teams: teams.map((t) => ({
                id: Number(t.id),
                name: String(t.team_name),
                score: Number(t.performance_score),
                metrics: parseJson(t.metrics_json, {}),
            })),
            total_users: Number(userCount[0]?.cnt ?? 0),
        },
    });
}
