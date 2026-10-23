# BEST Ultimate Workspace & Creative Ecosystem

Modern monorepo: **server** (Express + Socket.IO + MariaDB) · **gui** (Next.js 15 App Router, TypeScript, Pure CSS Modules — no Tailwind).

Premium dual-theme UI, AI-assisted productivity modules, realtime collaboration.

## Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | Next.js 15 (App Router), React 19, TypeScript strict, CSS Modules |
| Backend   | Node.js 20+, Express, Socket.IO, JWT, bcrypt, Helmet |
| Database  | MariaDB (mysql2/promise)                        |
| AI        | OpenAI task priority scoring                    |
| Payments  | Stripe PaymentIntents & Subscriptions           |

## Project structure

```
best-workspace/          (or dvy/)
├── package.json         # workspaces + concurrent scripts
├── schema.sql           # MariaDB schema
├── ARCHITECTURE.md
├── .gitignore
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   ├── scripts/seed.ts
│   ├── package.json
│   └── .env.example
└── gui/
    ├── src/
    │   ├── app/             # App Router (auth + dashboard groups)
    │   ├── components/      # Feature + shared UI
    │   ├── lib/             # api, auth, theme
    │   ├── styles/          # globals.css (design tokens)
    │   └── types/
    ├── public/
    ├── next.config.mjs
    ├── package.json
    └── .env.example
```

## Quick start

```bash
# 1. Database
mysql -u root -p < schema.sql

# 2. Environment
cp server/.env.example server/.env
cp gui/.env.example gui/.env.local
# Fill: DB_*, JWT_SECRET, OPENAI_API_KEY, STRIPE_* (optional)

# 3. Install
npm install

# 4. Seed demo users (bcrypt passwords)
npm run seed

# 5. Development
npm run dev
# API  → http://localhost:4000
# GUI  → http://localhost:3000
```

### Demo accounts (after seed)

| Email             | Password      | Role  |
|-------------------|---------------|-------|
| admin@best.app    | Password123!  | admin |
| maya@best.app     | Password123!  | user  |
| leo@best.app      | Password123!  | user  |

## Production build

```bash
npm run build          # builds server + gui
npm run start          # concurrent production start
```

Or deploy separately:

- **GUI** → Vercel / any Node host (set `API_INTERNAL_URL` or `NEXT_PUBLIC_API_URL`)
- **Server** → Coolify / VPS / Docker (expose 4000, connect MariaDB)

### Environment variables

**gui/.env.local**

```
NEXT_PUBLIC_API_URL=          # empty = same-origin /api rewrite
NEXT_PUBLIC_WS_URL=
API_INTERNAL_URL=http://127.0.0.1:4000
```

**server/.env** — see `server/.env.example` for DB, JWT, OpenAI, Stripe.

## Modules

- Auth (JWT + protected dashboard)
- AI Todos (priority scoring, Kanban)
- Notes + PDF export
- Visual Boards / Canvas
- Social Feed
- Realtime Chat (Socket.IO)
- Teams & analytics
- Admin center
- Stripe billing

## Design system

- Pure CSS Modules + CSS custom properties
- Dual theme (light / dark) via `data-theme` + ThemeProvider
- Accent: indigo → violet gradient
- Glass surfaces, soft shadows, reduced-motion support
- Inter (next/font) for optimal loading

## Scripts

| Command          | Description                    |
|------------------|--------------------------------|
| `npm run dev`    | Concurrent server + gui        |
| `npm run build`  | Production build both          |
| `npm run start`  | Production start               |
| `npm run seed`   | Seed demo users                |
| `npm run lint -w gui` | ESLint                     |

## License

Private / proprietary.
