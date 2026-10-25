# BEST Ultimate Workspace (dvy)

AI destekli üretkenlik ve işbirliği platformu.  
**Stack:** Node.js / Express · MariaDB · Socket.IO · Next.js 15 · TypeScript

## Dizinler

```
dvy/
├── package.json          # workspaces + build / start
├── scripts/start-prod.mjs # tek container production starter
├── schema.sql            # MariaDB şema + migration
├── ARCHITECTURE.md       # Mimari rapor
├── server/               # REST API + WebSocket (:4000)
└── gui/                  # Next.js 15 App Router (:3000)
```

## Hızlı başlangıç (lokal)

### 1. Veritabanı

```bash
mysql -u root -p < schema.sql
```

### 2. Bağımlılıklar (kökten)

```bash
npm install
```

### 3. Backend

```bash
cd server
cp .env.example .env   # DB + JWT + isteğe bağlı OpenAI/Stripe
npm run seed           # demo kullanıcılar (opsiyonel)
npm run dev            # http://localhost:4000
```

Health: `GET http://localhost:4000/health`

### 4. Frontend

```bash
cd gui
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

`next.config.mjs` production’da `/api` ve `/socket.io` isteklerini Express’e proxy’ler.

## Demo hesaplar (seed sonrası)

| E-posta | Şifre |
|---------|--------|
| maya@best.app | Password123! |
| admin@best.app | Password123! |

## Production / Coolify deploy

Kök `package.json` artık standart `build` ve `start` script’lerine sahiptir:

```bash
npm run build   # server (tsc) + gui (next build)
npm start       # scripts/start-prod.mjs → API :4000 + Next :$PORT
```

### Coolify ayarları

1. **Build Command:** `npm run build`  
   (veya boş bırakın; Railpack `npm run build` çalıştırır)
2. **Start Command:** `npm start`
3. **Port:** `3000` (public GUI). API içeride `4000` dinler.
4. **Önemli ortam değişkenleri (Runtime):**

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Coolify’ın verdiği public port (GUI) — genelde otomatik |
| `PORT_API` | API portu (varsayılan `4000`) |
| `API_INTERNAL_URL` | `http://127.0.0.1:4000` (aynı container) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MariaDB |
| `JWT_SECRET` | Uzun rastgele string |
| `CLIENT_ORIGIN` | `https://your-domain.com` (virgülle çoklu) |
| `NODE_ENV` | `production` |

5. **Build-time uyarıları:**  
   Coolify’da `NODE_ENV` ve `NPM_CONFIG_PRODUCTION` değişkenlerini **Runtime only** yapın.  
   Build sırasında `NODE_ENV=development` (veya hiç set etmeyin) kalması, TypeScript / Next build araçlarının yüklenmesini garantiler.  
   Bu projede typescript ve @types zaten `dependencies` altında olduğu için `omit=dev` ile de build çalışır.

6. Veritabanı: önce `schema.sql`’i MariaDB’ye uygulayın, sonra deploy edin.

### Tek komut kontrol (lokal production benzeri)

```bash
npm install
npm run build
PORT=3000 PORT_API=4000 API_INTERNAL_URL=http://127.0.0.1:4000 npm start
```

## Özellikler

- **Auth:** JWT kayıt / giriş / profil / şifre
- **Todos:** 0–5 yıldız rating (0.5 adım), sticker, not, due, nested sub-todo, AI rate, kanban
- **Notes:** şablonlar, AI özet, PDF export
- **Boards:** canvas şekil/ok/metin
- **Chat:** Socket.IO anlık mesaj, presence, typing
- **Teams:** member_color, performans
- **Feed:** post, like, comment
- **Billing:** Stripe iskeleti
- **Admin:** log paneli

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
