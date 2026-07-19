#!/usr/bin/env bash
# One-command bootstrap for a fresh VPS with Docker installed.
# Generates secrets, builds the sandbox base image, and brings the stack up.
set -euo pipefail

cd "$(dirname "$0")/.."

env_value() {
    local key="$1"
    awk -v prefix="${key}=" 'index($0, prefix) == 1 { print substr($0, length(prefix) + 1); exit }' .env
}

set_env() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" .env; then
        sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
        rm -f .env.bak
    else
        printf '%s=%s\n' "${key}" "${value}" >> .env
    fi
}

if [ ! -f .env ]; then
    echo "→ creating .env from .env.example"
    cp .env.example .env

    JWT=$(openssl rand -hex 32)
    KEY=$(openssl rand -hex 32)
    NAMESPACE="instance-$(openssl rand -hex 6)"
    NETWORK="cc-${NAMESPACE}-sandboxes"
    set_env JWT_SECRET "${JWT}"
    set_env ENCRYPTION_KEY "${KEY}"
    set_env SANDBOX_NAMESPACE "${NAMESPACE}"
    set_env SANDBOX_NETWORK "${NETWORK}"
    chmod 600 .env
    echo "→ generated JWT_SECRET, ENCRYPTION_KEY and an isolated sandbox namespace"
    echo "!! Edit .env and set WEB_DOMAIN, API_DOMAIN, PUBLIC_API_URL, CORS_ORIGIN, WEB_URL before continuing."
    echo "   Re-run this script when ready."
    exit 0
fi

# Upgrade older .env files that used daemon-global container/volume/network names.
NAMESPACE="${SANDBOX_NAMESPACE:-$(env_value SANDBOX_NAMESPACE)}"
if [ -z "${NAMESPACE}" ]; then
    NAMESPACE="instance-$(openssl rand -hex 6)"
    set_env SANDBOX_NAMESPACE "${NAMESPACE}"
    echo "→ generated missing sandbox namespace (${NAMESPACE})"
fi
NETWORK="${SANDBOX_NETWORK:-$(env_value SANDBOX_NETWORK)}"
if [ -z "${NETWORK}" ] || [ "${NETWORK}" = "cloud-code-sandboxes" ]; then
    NETWORK="cc-${NAMESPACE}-sandboxes"
    set_env SANDBOX_NETWORK "${NETWORK}"
    echo "→ isolated sandbox network (${NETWORK})"
fi
chmod 600 .env

BASE_IMAGE="${SANDBOX_BASE_IMAGE:-$(env_value SANDBOX_BASE_IMAGE)}"
BASE_IMAGE="${BASE_IMAGE:-cloud-code/sandbox-base:ubuntu}"

echo "→ building sandbox base image (${BASE_IMAGE})"
docker build -f docker/sandbox-base.Dockerfile -t "${BASE_IMAGE}" .

echo "→ creating the isolated sandbox network (${NETWORK}) if missing"
docker network inspect "${NETWORK}" >/dev/null 2>&1 \
    || docker network create "${NETWORK}"

echo "→ starting the stack"
docker compose up -d --build

echo "✓ Cloud Code is up. Web: https://${WEB_DOMAIN:-<WEB_DOMAIN>}  API: https://${API_DOMAIN:-<API_DOMAIN>}"
