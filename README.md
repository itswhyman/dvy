# BEST Ultimate Workspace

AI destekli üretkenlik ve işbirliği platformu.  
**Stack:** Node.js / Express · MariaDB · Socket.IO · Next.js 15 · TypeScript

## Dizinler

```
dvy/
├── schema.sql          # MariaDB şema + migration
├── ARCHITECTURE.md     # Mimari rapor
├── server/             # REST API + WebSocket (:4000)
└── gui/                # Next.js 15 App Router (:3000)
```

## Hızlı başlangıç

### 1. Veritabanı

```bash
mysql -u root -p < schema.sql
```

### 2. Backend

```bash
cd server
cp .env.example .env   # DB + JWT + isteğe bağlı OpenAI/Stripe
npm install
npm run seed           # demo kullanıcılar (opsiyonel)
npm run dev            # http://localhost:4000
```

Health: `GET http://localhost:4000/health`

### 3. Frontend

```bash
cd gui
cp .env.example .env.local   # boş bırakılabilir (rewrite /api → backend)
npm install
npm run dev                  # http://localhost:3000
```

`next.config.mjs` production’da `/api` ve `/socket.io` isteklerini Express’e proxy’ler.

## Demo hesaplar (seed sonrası)

| E-posta | Şifre |
|---------|--------|
| maya@best.app | Password123! |
| admin@best.app | Password123! |

## Özellikler (bu sürüm)

- **Auth:** JWT kayıt / giriş / profil / şifre
- **Todos:** 0–5 yıldız rating (0.5 adım), sticker, not, due, nested sub-todo, AI rate, kanban drag-drop
- **Notes:** blank/grid/lined/dotted/music/calendar şablonları, AI özet, PDF export
- **Boards:** canvas şekil/ok/metin, JSON persist
- **Chat:** Socket.IO anlık mesaj, presence, typing
- **Teams:** oluşturma, immutable member_color, performans
- **Feed:** post, like, comment
- **Billing:** Stripe checkout iskeleti
- **Admin:** log paneli

## Renk / UI

Aurora design system — glass surface, gradient brand (`#E86D4A` → `#C9A227` → `#2A9D8F`), dark/light tema.

## Production notları

1. `schema.sql` içindeki `ALTER ... sticker` migration’ını mevcut DB’lerde çalıştır.
2. Express: `CLIENT_ORIGIN` = gerçek domain(ler)
3. Next: `API_INTERNAL_URL` = internal Express adresi (Coolify/Docker)
4. `JWT_SECRET` ve Stripe/OpenAI anahtarlarını production secret store’dan ver.

## API özeti

| Prefix | Açıklama |
|--------|----------|
| `/api/auth/*` | register, login, me, profile, password |
| `/api/todos` | CRUD + reorder + ai-rate + sub |
| `/api/notes` | CRUD + summarize |
| `/api/boards` | CRUD + canvas JSON |
| `/api/posts` | list, create, like, comments |
| `/api/messages/*` | contacts, dm, presence |
| `/api/teams` | list, get, create, analytics |
| `/api/billing/*` | subscription, checkout, webhook |
| `/api/admin/*` | admin only |

---

BEST Workspace · 2026
