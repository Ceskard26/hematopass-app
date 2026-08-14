# syntax=docker/dockerfile:1

# Multi-stage: el artefacto final es el mismo tanto en AWS como en un
# servidor on-premise del INSNSB. Ver docs/arquitectura.md §2 — esta
# equivalencia es deliberada, no un atajo.

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL dummy: next build no ejecuta queries, pero drizzle/postgres
# se instancian a nivel de módulo y necesitan una URL con forma válida.
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

# ---- runtime ------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 hematopass

COPY --from=build /app/public ./public
COPY --from=build --chown=hematopass:nodejs /app/.next/standalone ./
COPY --from=build --chown=hematopass:nodejs /app/.next/static ./.next/static

USER hematopass
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
