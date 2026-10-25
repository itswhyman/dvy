# BEST Ultimate Workspace (dvy)

**Stack:** Express + Socket.IO + MariaDB + Next.js 15

## Lokal geliştirme

```bash
# 1) DB
mysql -u root -p < schema.sql

# 2) Bağımlılık
npm install

# 3) Backend
cd server && cp .env.example .env   # DB + JWT ayarla
npm run seed                        # demo: maya@best.app / Password123!
npm run dev                         # :4000

# 4) Frontend (ayrı terminal)
cd gui && cp .env.example .env.local
npm run dev                         # :3000
```

## Coolify / Docker deploy

Projede **Dockerfile** var. Coolify bunu otomatik kullanır (Railpack’e gerek yok).

### 1. Coolify uygulama ayarları

| Ayar | Değer |
|------|--------|
| Build Pack | **Dockerfile** (veya otomatik tespit) |
| Port | **3000** |
| Start Command | *(boş bırak – Dockerfile CMD kullanır)* |

### 2. Environment Variables — TAM LİSTE

**Build-time işaretini KAPAT** (sadece Runtime).  
Aşağıdaki değerleri **aynen** gir:

| Key | Value | Buildtime? |
|-----|-------|------------|
| `NODE_ENV` | `production` | ❌ Runtime only |
| `NPM_CONFIG_PRODUCTION` | `true` | ❌ Runtime only |
| `PORT` | `3000` | ❌ Runtime only |
| `PORT_API` | `4000` | ❌ Runtime only |
| `API_INTERNAL_URL` | `http://127.0.0.1:4000` | ❌ Runtime only |
| `DB_HOST` | *(MariaDB host)* | ❌ Runtime only |
| `DB_PORT` | `3306` | ❌ Runtime only |
| `DB_USER` | *(user)* | ❌ Runtime only |
| `DB_PASSWORD` | *(password)* | ❌ Runtime only |
| `DB_NAME` | `best_workspace` | ❌ Runtime only |
| `JWT_SECRET` | *(uzun rastgele string)* | ❌ Runtime only |
| `JWT_EXPIRES_IN` | `7d` | ❌ Runtime only |
| `CLIENT_ORIGIN` | `https://senin-domainin.com` | ❌ Runtime only |

> **Önemli:** `NODE_ENV` ve `NPM_CONFIG_PRODUCTION` için Coolify’da  
> “Available at Buildtime” / “Build-time” kutusunu **işaretleme**.  
> Dockerfile zaten build aşamasında `NODE_ENV=development` zorluyor.

### 3. Deploy öncesi

1. MariaDB’de `schema.sql` çalıştırılmış olsun.  
2. Coolify’da **Clear build cache** yap (önceki bozuk katmanlar kalmasın).  
3. Deploy.

### 4. Hâlâ yavaş / hata alırsan

- Build logunda `npm ci` görüyorsan Dockerfile kullanılıyordur (iyi).  
- Eski Railpack planı kalmışsa uygulamayı silip yeniden oluştur veya  
  Settings → Build Pack = **Dockerfile** seç.

## Demo hesap

| E-posta | Şifre |
|---------|--------|
| maya@best.app | Password123! |
| admin@best.app | Password123! |

## Mimari (tek container)

```
Internet → :3000 (Next.js)
              ├─ /api/*      → rewrite → 127.0.0.1:4000
              └─ /socket.io  → rewrite → 127.0.0.1:4000
         → :4000 (Express + Socket.IO) → MariaDB
```

---
BEST Workspace · 2026
