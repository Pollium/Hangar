# Edge container: builds the SPA, then serves it and reverse-proxies the API (incl. WebSockets)
# behind automatic TLS via Caddy.
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# All workspace manifests are needed for a frozen install to satisfy the lockfile. --filter web
# keeps the install to the SPA's own tree, so the API's native deps (better-sqlite3) are never
# built here — this stage has no compiler.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --filter web --frozen-lockfile

COPY packages/contracts packages/contracts
COPY packages/web packages/web
RUN pnpm --filter web build

FROM caddy:2
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/web/dist /srv
