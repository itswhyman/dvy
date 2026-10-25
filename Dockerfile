# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- install all deps (dev included) ----
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY server/package.json ./server/
COPY gui/package.json ./gui/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --no-audit --no-fund

# ---- build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=deps /app/server/package.json ./server/
COPY --from=deps /app/gui/package.json ./gui/
# copy sources
COPY server ./server
COPY gui ./gui
COPY scripts ./scripts
COPY schema.sql package.json ./
# Force build tools available
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN npm run build -w server \
 && npm run build -w gui

# ---- production image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PORT_API=4000
ENV API_INTERNAL_URL=http://127.0.0.1:4000
ENV NEXT_TELEMETRY_DISABLED=1

# Install production deps only
COPY package.json package-lock.json .npmrc ./
COPY server/package.json ./server/
COPY gui/package.json ./gui/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# App code + build output
COPY --from=builder /app/server ./server
COPY --from=builder /app/gui ./gui
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
# Coolify runs as root by default; keep flexible
CMD ["node", "scripts/start-prod.mjs"]
