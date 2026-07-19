# The outbound compute agent, run by a user on their own VPS. It mounts the host Docker socket
# and dials OUT to the control plane — no inbound ports. This is the only place a Docker socket
# is ever exposed, and it stays on the user's machine.
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

# Workspace manifests for a frozen install that satisfies the lockfile.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/agent/package.json packages/agent/package.json
RUN pnpm install --filter @hangar/agent --frozen-lockfile

COPY packages/contracts packages/contracts
COPY packages/agent packages/agent

# HANGAR_URL and HANGAR_TOKEN are provided at `docker run` time (see the install command).
CMD ["pnpm", "--filter", "@hangar/agent", "start"]
