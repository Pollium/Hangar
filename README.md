# Cloud Code

Self-hosted control plane for running coding-agent CLIs (Claude Code, Codex, OpenCode,
Gemini CLI) 24/7 inside isolated Docker sandboxes, managed from a web UI. Deploy it on your
own VPS, drop in your API keys, and keep agents working while your browser is closed.

## How it works

- **One sandbox per project** — a hardened Ubuntu container with a persistent volume for the
  repo and CLI config. Resource-limited, non-root, no host Docker socket, isolated network.
- **Sessions run in tmux** — the agent is owned by tmux, not the WebSocket. Closing the tab
  detaches; the agent keeps running. Reconnecting re-attaches and replays the screen.
- **Pluggable CLIs** — one adapter class per CLI. The terminal streams raw PTY bytes, so any
  interactive CLI works.
- **Live status + notifications** — sessions report running / needs-input / idle; you get an
  in-app notification (and, when configured, web push) the moment an agent needs you.
- **Fleet dashboard** — every session across projects at a glance, attention-needing first.
- **Scheduled tasks** — cron-driven agent runs ("every night, update deps and open a PR").

## Architecture

pnpm monorepo, three packages:

- `packages/contracts` — shared types + typed route tables (single source for API and web).
- `packages/api` — Fastify + TypeORM + BullMQ. Modules auto-discovered by folder convention
  (`controllers/`, `services/`, `models/`, `gateways/`, `queues/`, `events/`).
- `packages/web` — React 19 + Vite + HeroUI + alova + zustand. Routes discovered by folder.

The control-plane API drives the host Docker daemon via `dockerode`; agents never touch it.

## Requirements

- A VPS with Docker + Docker Compose.
- Two DNS records (web + api subdomains) for automatic TLS, or run locally without TLS.

## Deploy

```bash
git clone <repo> cloud-code && cd cloud-code
./scripts/install.sh          # 1st run: writes .env with generated secrets
# edit .env → set WEB_DOMAIN, API_DOMAIN, PUBLIC_API_URL, CORS_ORIGIN, WEB_URL
./scripts/install.sh          # 2nd run: builds the sandbox image and starts the stack
```

Then open `https://<WEB_DOMAIN>`, create an account (or set `ALLOW_SIGNUP=false` for
single-admin), add your provider API keys in Settings, create a project, and start a session.

## Local development

```bash
pnpm install
cp .env.example packages/api/.env      # set a 32-byte hex ENCRYPTION_KEY
docker compose up -d redis
pnpm dev:api        # http://localhost:4000
pnpm dev:web        # http://localhost:5173
```

## Security model

Running arbitrary code on your VPS, reachable over the web, is the dangerous part. The
defaults are conservative:

- **Auth everywhere** — JWT on HTTP and WebSocket; every resource is ownership-checked.
- **Sandbox isolation** — `CapDrop: ALL`, `no-new-privileges`, pids/memory/cpu ceilings,
  non-root `coder` user, tmpfs `/tmp`, a dedicated bridge network, and never `--privileged`.
- **Docker socket** — mounted only into the `api` container, never a sandbox.
- **Secrets at rest** — provider keys are AES-256-GCM encrypted (`SecretCipher`) and only
  decrypted in memory to inject into a sandbox at session start. Never logged, never returned.
- **Rate limiting** on auth endpoints.
- Recommended: put the deployment behind a VPN/Tailscale if you don't need public access,
  and restrict sandbox network egress to the AI APIs you actually use.

## Adding a CLI

Implement `CliAdapter` (`packages/api/src/modules/clis/adapters/`) and register it in
`registry.ts`. Define `installCommand`, `startCommand`, and a `detectStatus` heuristic. No
other code changes.

## Tests

```bash
pnpm --filter @cloud-code/api test     # vitest, in-memory sqlite, Docker mocked
```
