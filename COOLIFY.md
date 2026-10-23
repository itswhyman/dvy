# Coolify Deploy Notes

## Build error: workspace `server` not found

**Cause:** Root `package.json` had `"build": "npm run build -w server && ..."` but Coolify Base Directory may be only `gui/`, or `server/` is missing from the deploy context.

**Fix applied:**
- `npm run build` → `node scripts/build.mjs` (builds only workspaces that exist)
- `npm run start` → `node scripts/start.mjs`
- `nixpacks.toml` for Node 20 + `npm ci --include=dev`

### Recommended Coolify setup (monorepo)

**Option A — two services**
1. Service `api`: Base Directory = `server`, Build = `npm run build`, Start = `npm run start`, Port = 4000
2. Service `web`: Base Directory = `gui`, Build = `npm run build`, Start = `npm run start`, Port = 3000  
   Env: `API_INTERNAL_URL=http://<api-service>:4000`, `NEXT_PUBLIC_API_URL=` (empty)

**Option B — single root**
- Base Directory = `/` (repo root)
- Build Command = `npm run build`
- Start Command = `npm run start`
- Ensure both `server/` and `gui/` are in the Git repo (no nested `.git` inside server that might confuse sparse checkout)

### Nested `.git` warning
If `server/.git` exists inside the monorepo, some deploy pipelines only push the outer repo and drop nested content inconsistently. Prefer one root `.git`.

### Theme
- Default: **light** (`data-theme="light"` on `<html>`)
- Toggle: `ThemeToggle` + `useTheme()` / localStorage `best_theme`
