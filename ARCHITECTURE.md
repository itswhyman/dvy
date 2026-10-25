# BÜTÜNSEL PROJE MİMARİ RAPORU — BEST Workspace

## 1. Genel Bakış

**BEST Ultimate Workspace**, npm workspaces monorepo’sudur:

| Paket | Rol | Stack |
|-------|-----|--------|
| `server/` | REST API + WebSocket | Express 4, Socket.IO, mysql2, JWT, bcrypt, Helmet, Stripe, OpenAI |
| `gui/` | SPA / App Router UI | Next.js 15 (App Router), TypeScript, **Pure CSS Modules** (Tailwind yok) |

Kök `package.json` workspaces: `["server","gui"]`. Dev: `concurrently` ile API `:4000` + GUI `:3000`.

---

## 2. Dosya / Klasör Hiyerarşisi

```
best-workspace/
├── package.json              # workspaces + build/dev scripts
├── schema.sql                # MariaDB şema + seed SQL
├── ARCHITECTURE.md           # bu rapor
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── scripts/seed.ts       # bcrypt’li demo kullanıcılar
│   └── src/
│       ├── index.ts          # Express bootstrap, /api mount, static, catch-all
│       ├── config/db.ts      # mysql2 pool + safeQuery
│       ├── middleware/auth.ts # JWT sign/verify, requireAuth, requireRole
│       ├── routes/index.ts   # tüm REST rotaları (prefix /api)
│       ├── controllers/      # auth, todos, notes, boards, posts, messages,
│       │                     # teams, payments, admin
│       ├── services/
│       │   ├── loggerService.ts  # in-memory ring buffer (admin logs)
│       │   ├── socket.ts         # Socket.IO presence + DM/group chat
│       │   └── aiService.ts      # OpenAI todo priority scoring
│       └── types/
└── gui/
    ├── next.config.mjs       # headers + /api & /socket.io rewrites → Express
    ├── package.json
    ├── .env.example
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.tsx          # AuthProvider + CookieBanner
        │   ├── page.tsx            # Landing (redirect YOK)
        │   ├── not-found.tsx / error.tsx / global-error.tsx
        │   ├── (auth)/login|register
        │   └── (dashboard)/        # auth-guarded shell + Sidebar
        │       ├── layout.tsx
        │       ├── todos|notes|boards|chat|feed|teams|billing|profile|admin
        ├── components/             # UI: TodoList, NoteEditor, BoardCanvas,
        │                           # ChatUI, SystemLogs, CookieBanner, ...
        ├── lib/api.ts              # fetch helper, BASE=/api veya NEXT_PUBLIC_API_URL
        ├── lib/auth.tsx            # Auth context (token localStorage)
        ├── styles/globals.css      # CSS variables (dark premium theme)
        └── types/
```

---

## 3. Frontend ↔ Backend Entegrasyon

### Dev (iki port)
- GUI: `http://localhost:3000`
- API: `http://localhost:4000`
- `gui/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4000/api` **veya** boş bırakıp rewrite kullan

### Production (tek domain, örn. www.dovye.com.tr)
1. Tarayıcı `POST /api/auth/login` atar (relative path, `api.ts` → `BASE = '/api'`).
2. **Next.js `rewrites`** (`next.config.mjs`) isteği internal Express’e iletir:
   - `API_INTERNAL_URL` (Coolify env) → örn. `http://server:4000` veya `http://127.0.0.1:4000`
   - `/api/:path*` → `${API_INTERNAL_URL}/api/:path*`
   - `/socket.io/:path*` → aynı backend
3. Express: `app.use('/api', routes)` → `POST /api/auth/login` = `router.post('/auth/login', ...)`.

**404 kök nedeni (düzeltildi):** Public domain’de `/api` Next’e düşüyordu; App Router’da route handler olmadığı için 404. Rewrite + Express JSON 404 middleware eklendi.

**Coolify kontrol listesi:**
- Express servisi ayakta ve health: `GET /health`
- Next env: `API_INTERNAL_URL=<express-internal-url>`
- Next env: `NEXT_PUBLIC_API_URL` boş veya `https://www.dovye.com.tr/api` (çift `/api` olmamalı)
- Express env: `CLIENT_ORIGIN=https://www.dovye.com.tr,https://dovye.com.tr`
- Reverse proxy gerekirse Traefik/Caddy ile `/api` ve `/socket.io` doğrudan Express’e de yönlendirilebilir (rewrite alternatifi)

---

## 4. Veritabanı Katmanı

- **DB:** MariaDB / MySQL, `schema.sql` (UTF8MB4, InnoDB).
- **Bağlantı:** `mysql2/promise` pool (`connectionLimit: 15`), `config/db.ts`.
- **API:** `queryRows` / `execute` + `safeQuery` (hata → fallback, process crash yok).
- **ORM yok** — ham SQL + typed RowDataPacket.
- **Tablolar (özet):** users, todos (+ sticker, priority 0.0–5.0 step 0.5, nested sub_todos), notes (template), boards, posts, post_likes, comments, messages, teams, team_members (member_color), subscriptions, system_settings, …
- **Seed:** `npm run seed` → `server/scripts/seed.ts` (bcrypt hash’li demo: admin@best.app, maya@best.app, … / `Password123!`).
- **Env:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **Todo rating:** `priority` DECIMAL(2,1) 0–5 (0.5 adım). AI skoru 0–100 → yıldız rating’e map edilir. `sticker` görsel etiket.

---

## 5. Servisler ve WebSocket

| Servis | Görev |
|--------|--------|
| `loggerService.ts` | Bellek içi ring buffer (max ~2000). HTTP 4xx/5xx, API, DB, socket event logları. Admin panel `/admin/logs` filtreler. |
| `socket.ts` | Aynı HTTP server üzerinde Socket.IO. JWT handshake. Presence map, `user:{id}` / `group:{id}` / DM odaları, `chat:message` → DB insert + emit. |
| `aiService.ts` | OpenAI ile todo öncelik skoru (`ai_score`, priority). |

Socket path: `/socket.io` (Next rewrite ile aynı origin).

---

## 6. Güvenlik ve Auth Akışı

1. **Register/Login** → bcrypt hash / compare → `signToken({ userId, email, role })`.
2. Token **localStorage** `best_token` (Bearer header).
3. `requireAuth` middleware: `Authorization: Bearer <jwt>`.
4. `requireRole('admin')` admin rotaları için.
5. CORS: `CLIENT_ORIGIN` (virgülle çoklu domain).
6. Helmet (CSP kapalı, CORP cross-origin).
7. Stripe webhook: raw body, ayrı mount.
8. CookieBanner: KVKK consent `localStorage` (session cookie değil).

**Dashboard koruması:** `(dashboard)/layout.tsx` client-side; `!user` → `/login`.

---

## 7. Auth Route Eşlemesi (404 fix doğrulama)

| İstemci | Express |
|---------|---------|
| `POST /api/auth/login` | `app.use('/api', routes)` + `router.post('/auth/login', ...)` |
| `POST /api/auth/register` | `router.post('/auth/register', ...)` |
| `GET /api/auth/me` | `requireAuth` + `auth.me` |

Unmatched `/api/*` → JSON `{ success:false, error:"API endpoint not found..." }` (HTML catch-all’a düşmez).

---

## 8. Deployment Özeti (dovye.com.tr)

```
Browser  →  https://www.dovye.com.tr/api/auth/login
         →  Next rewrite  →  http://<express-internal>:4000/api/auth/login
         →  Express routes  →  authController.login  →  MariaDB
```

Gerekli env (örnek):
```
# Next (gui)
API_INTERNAL_URL=http://127.0.0.1:4000   # veya Coolify service DNS
NEXT_PUBLIC_API_URL=                      # boş = relative /api

# Express (server)
PORT=4000
CLIENT_ORIGIN=https://www.dovye.com.tr,https://dovye.com.tr
JWT_SECRET=<güçlü-secret>
DB_* = ...
```

Health check: `GET https://www.dovye.com.tr/api/../health` veya doğrudan Express `/health`.
