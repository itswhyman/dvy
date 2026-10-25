import { Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { execute, parseJson, queryRows } from '../config/db.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { Team } from '../types/index.js';

/** Palette for immutable per-membership colors */
const MEMBER_COLORS = [
  '#E86D4A',
  '#2A9D8F',
  '#C9A227',
  '#8B6CF0',
  '#C45C8A',
  '#3D8BFF',
  '#22D3EE',
  '#F472B6',
  '#34D399',
  '#FBBF24',
];

function pickColor(seed: number): string {
  return MEMBER_COLORS[Math.abs(seed) % MEMBER_COLORS.length];
}

function mapTeam(r: RowDataPacket): Team {
  const name = String(r.name ?? r.team_name ?? `Team #${r.id}`);
  return {
    id: Number(r.id),
    name,
    team_name: name,
    description: r.description != null ? String(r.description) : null,
    owner_id: r.owner_id != null ? Number(r.owner_id) : undefined,
    lead_user_id: Number(r.owner_id ?? r.lead_user_id ?? 0),
    performance_score: Number(r.performance_score ?? 0),
    metrics_json: parseJson<Record<string, number> | null>(r.metrics_json, {
      completed_week: 0,
      wip: 0,
      velocity: 0,
    }),
    created_at: new Date(r.created_at as string).toISOString(),
  };
}

export async function listTeams(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  // Prefer teams the user belongs to; fall back to all if membership query fails
  let rows = await queryRows<RowDataPacket[]>(
    `SELECT t.*
     FROM teams t
     INNER JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.user_id = ?
     ORDER BY t.created_at DESC`,
    [userId],
    'teams:list:mine'
  );

  if (!rows.length) {
    rows = await queryRows<RowDataPacket[]>(
      'SELECT * FROM teams ORDER BY created_at DESC LIMIT 50',
      [],
      'teams:list:all'
    );
  }

  res.json({ success: true, data: rows.map(mapTeam) });
}

export async function getTeam(req: AuthRequest, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM teams WHERE id = ?',
    [id],
    'teams:get'
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Team not found.' });
    return;
  }

  const members = await queryRows<RowDataPacket[]>(
    `SELECT tm.team_id, tm.user_id, tm.role, tm.member_color, tm.joined_at,
            u.name, u.email, u.avatar_url, u.status
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.joined_at ASC`,
    [id],
    'teams:members'
  );

  res.json({
    success: true,
    data: {
      ...mapTeam(rows[0]),
      members: members.map((m) => ({
        team_id: Number(m.team_id),
        user_id: Number(m.user_id),
        id: Number(m.user_id),
        name: String(m.name),
        email: String(m.email),
        avatar_url: m.avatar_url ? String(m.avatar_url) : null,
        role: String(m.role),
        role_in_team: String(m.role),
        member_color: String(m.member_color || pickColor(Number(m.user_id))),
        status: m.status ? String(m.status) : 'offline',
        joined_at: new Date(m.joined_at as string).toISOString(),
      })),
    },
  });
}

export async function createTeam(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const body = req.body as {
    name?: string;
    team_name?: string;
    description?: string;
  };
  const name = (body.name || body.team_name || '').trim();
  if (!name) {
    res.status(422).json({ success: false, error: 'Team name required.' });
    return;
  }

  // Schema: name, description, owner_id
  let result = await execute(
    `INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?)`,
    [name.slice(0, 160), body.description?.trim() || null, userId],
    'teams:create'
  );

  // Legacy fallback if older schema with team_name/lead_user_id
  if (!result?.insertId) {
    result = await execute(
      `INSERT INTO teams (team_name, lead_user_id, performance_score, metrics_json)
       VALUES (?, ?, 0, ?)`,
      [
        name.slice(0, 160),
        userId,
        JSON.stringify({ completed_week: 0, wip: 0, velocity: 0 }),
      ],
      'teams:create:legacy'
    );
  }

  if (!result?.insertId) {
    res.status(503).json({ success: false, error: 'Could not create team.' });
    return;
  }

  const teamId = result.insertId;
  const color = pickColor(userId + teamId);

  // Member row with immutable color
  let memberOk = await execute(
    `INSERT INTO team_members (team_id, user_id, role, member_color)
     VALUES (?, ?, 'owner', ?)`,
    [teamId, userId, color],
    'teams:member'
  );

  if (!memberOk) {
    await execute(
      `INSERT INTO team_members (team_id, user_id, role_in_team)
       VALUES (?, ?, 'lead')`,
      [teamId, userId],
      'teams:member:legacy'
    );
  }

  const rows = await queryRows<RowDataPacket[]>(
    'SELECT * FROM teams WHERE id = ?',
    [teamId],
    'teams:create:read'
  );
  res.status(201).json({ success: true, data: rows[0] ? mapTeam(rows[0]) : null });
}

export async function analytics(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const todoStats = await queryRows<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS cnt FROM todos WHERE user_id = ? GROUP BY status`,
    [userId],
    'analytics:todos'
  );

  // Try schema columns first, then legacy
  let teams = await queryRows<RowDataPacket[]>(
    `SELECT t.id, t.name, t.owner_id, t.created_at
     FROM teams t
     INNER JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.user_id = ?
     ORDER BY t.created_at DESC`,
    [userId],
    'analytics:teams'
  );

  if (!teams.length) {
    teams = await queryRows<RowDataPacket[]>(
      'SELECT id, team_name AS name, lead_user_id AS owner_id, performance_score, metrics_json, created_at FROM teams ORDER BY created_at DESC LIMIT 20',
      [],
      'analytics:teams:legacy'
    );
  }

  const userCount = await queryRows<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM users',
    [],
    'analytics:users'
  );

  // Completion-based pseudo score per team (from member todos if available)
  const mapped = await Promise.all(
    teams.map(async (t) => {
      const tid = Number(t.id);
      const stats = await queryRows<RowDataPacket[]>(
        `SELECT status, COUNT(*) AS c FROM todos WHERE team_id = ? GROUP BY status`,
        [tid],
        'analytics:teamTodos'
      );
      const by: Record<string, number> = {};
      let total = 0;
      let completed = 0;
      for (const s of stats) {
        const n = Number(s.c);
        by[String(s.status)] = n;
        total += n;
        if (String(s.status) === 'completed') completed = n;
      }
      const score =
        t.performance_score != null
          ? Number(t.performance_score)
          : total
            ? Math.round((completed / total) * 1000) / 10
            : 0;
      return {
        id: tid,
        name: String(t.name ?? t.team_name ?? `Team #${tid}`),
        score,
        metrics: parseJson(t.metrics_json, {
          completed_week: completed,
          wip: by.in_progress || 0,
          velocity: score,
        }) as Record<string, number>,
      };
    })
  );

  res.json({
    success: true,
    data: {
      todos_by_status: Object.fromEntries(
        todoStats.map((r) => [String(r.status), Number(r.cnt)])
      ),
      teams: mapped,
      total_users: Number(userCount[0]?.cnt ?? 0),
    },
  });
}
