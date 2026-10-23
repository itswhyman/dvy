# BEST Ultimate Workspace & Creative Ecosystem

Monorepo: `/server` (Express + Socket.IO + MariaDB) · `/gui` (Next.js 15 App Router, Pure CSS Modules).

## Quick start

```bash
# 1. Database
mysql -u root -p < schema.sql

# 2. Env
cp server/.env.example server/.env
cp gui/.env.example gui/.env.local
# fill DB_*, JWT_SECRET, OPENAI_API_KEY, STRIPE_* 

# 3. Install & seed real bcrypt passwords
npm install
npm run seed

# 4. Dev
npm run dev
# API  → http://localhost:4000
# GUI  → http://localhost:3000
```

Demo logins (after seed): `admin@best.app` / `maya@best.app` / `leo@best.app` — password **`Password123!`**

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15, TypeScript, Pure CSS Modules (no Tailwind) |
| Backend | Node.js, Express, Socket.IO, JWT, bcrypt, Helmet, express-validator |
| DB | MariaDB via mysql2/promise pool + safeQuery fallbacks |
| AI | OpenAI task priority scoring |
| Payments | Stripe PaymentIntents & Subscriptions |

## Modules

Auth · AI Todos (Kanban) · Notes + PDF · Whiteboard Canvas · Social Feed · Real-time Chat · Team Analytics · Admin Center · Stripe Billing
