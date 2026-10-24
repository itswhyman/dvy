# BEST Ultimate Workspace — Architecture & Delivery Roadmap

## Current baseline (already in repo)

- Monorepo: `server/` (Express + Socket.IO + MariaDB) · `gui/` (Next.js 15 App Router)
- Socket.IO client: **dynamic origin** (no production localhost hardcode)
- Sidebar: Billing removed from primary nav → Profile & Settings
- Home: `/feed` with stories strip + comments UI
- Toast system: glass toast stack (`ToastProvider`)
- Schema: production `schema.sql` (utf8mb4, full table set)

## Spec → Reality matrix

| Spec area | Status | Notes |
|-----------|--------|-------|
| Dynamic Socket.IO | ✅ Done | `resolveWsUrl()` + server multi-origin CORS |
| schema.sql | ✅ Done | users, profiles, todos, sub_todos, notes, boards, posts, likes, comments, follows, blocks, chat groups, messages, teams, subscriptions, settings |
| No auto-seed users | ✅ Done | Seed inserts are commented; registration or manual SQL |
| Landing vs /feed | ✅ Partial | Landing exists; auth redirects to `/feed` |
| Sidebar cleanup | ✅ Done | Billing under Profile |
| Toast alerts | ✅ Done | Provider wired in root layout |
| Todos (stars, sub-todos, colors, charts) | 🔲 Next | Needs controller + UI rewrite on new schema |
| Notes (templates, tables, PDF import) | 🔲 Next | Schema ready; editor not yet template-aware |
| Miro boards | 🔲 Later | Canvas MVP exists; advanced charts/connectors phased |
| Nested comments | 🔲 Next | `parent_id` in schema; API needs tree response |
| Follow/block | 🔲 Next | Tables ready; controllers missing |
| Team member colors | 🔲 Next | `member_color` columns ready |
| Tier post limits | 🔲 Next | `subscriptions.post_limit` ready |

## Recommended build order

### Phase A — Data & Realtime foundation (this package)
1. Apply `schema.sql`
2. Keep Socket.IO fix + ToastProvider
3. Align TypeScript types with schema

### Phase B — Social core
1. Nested comments API (`post_comments.parent_id`)
2. Follow / unfollow / block controllers
3. Public profile pages
4. Post tier limits from subscriptions

### Phase C — Todos v2
1. priority DECIMAL 0–5 step 0.5
2. sub_todos CRUD + reorder
3. team assignee colors on borders
4. completion stats endpoint + lightweight charts

### Phase D — Notes v2
1. template field in UI
2. autosave + toast feedback
3. PDF export polish; import as Phase D.2

### Phase E — Boards v2
1. viewport persistence
2. connectors + basic shapes
3. tables / charts as progressive enhancement (not day-one Miro parity)

### Phase F — Chat polish
1. date dividers
2. unread badges
3. sound preference from user profile
4. group chat rooms

## Non-negotiable engineering rules

- Pure CSS Modules only (no Tailwind)
- Raw SQL + mysql2 pool (no ORM)
- JWT auth, role guards on admin routes
- Never hardcode production WebSocket hosts
- No surprise seed users in production migrations
- Ship vertical slices that compile and run; avoid half-wired Miro clones

## Env checklist (production)

```env
# gui
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_API_URL=
API_INTERNAL_URL=http://127.0.0.1:4000

# server
CLIENT_ORIGIN=https://www.dovye.com.tr,https://dovye.com.tr
JWT_SECRET=...
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=best_workspace
```

## Manual test user (optional)

```sql
-- After generating bcrypt hash for Password123!
INSERT INTO users (email, password_hash, name, role, member_color)
VALUES ('you@example.com', '$2a$10$...', 'Your Name', 'admin', '#6366F1');
```
