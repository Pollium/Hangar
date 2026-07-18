#!/usr/bin/env bash
# One-command bootstrap for a fresh VPS with Docker installed.
# Generates secrets, builds the sandbox base image, and brings the stack up.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "→ creating .env from .env.example"
    cp .env.example .env

    JWT=$(openssl rand -hex 32)
    KEY=$(openssl rand -hex 32)
    # Portable in-place sed (GNU/BSD).
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
    sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${KEY}|" .env
    rm -f .env.bak
    echo "→ generated JWT_SECRET and ENCRYPTION_KEY"
    echo "!! Edit .env and set WEB_DOMAIN, API_DOMAIN, PUBLIC_API_URL, CORS_ORIGIN, WEB_URL before continuing."
    echo "   Re-run this script when ready."
    exit 0
fi

echo "→ building sandbox base image (${SANDBOX_BASE_IMAGE:-cloud-code/sandbox-base:ubuntu})"
docker build -f docker/sandbox-base.Dockerfile -t "${SANDBOX_BASE_IMAGE:-cloud-code/sandbox-base:ubuntu}" .

echo "→ creating the isolated sandbox network (if missing)"
docker network inspect "${SANDBOX_NETWORK:-cloud-code-sandboxes}" >/dev/null 2>&1 \
    || docker network create "${SANDBOX_NETWORK:-cloud-code-sandboxes}"

echo "→ starting the stack"
docker compose up -d --build

echo "✓ Cloud Code is up. Web: https://${WEB_DOMAIN:-<WEB_DOMAIN>}  API: https://${API_DOMAIN:-<API_DOMAIN>}"
