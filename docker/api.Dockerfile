# Control-plane API. Holds NO Docker socket: every sandbox/codespace runs on a user's own agent,
# reached over the outbound agent tunnel. Ships the contracts package so it can resolve @hangar/contracts.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# All workspace manifests are needed for a frozen install to satisfy the lockfile.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --filter @hangar/api --frozen-lockfile

COPY packages/contracts packages/contracts
COPY packages/api packages/api

ENV PORT=4000
EXPOSE 4000
CMD ["pnpm", "--filter", "@hangar/api", "start"]
