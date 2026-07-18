# Base environment agents run inside. Built locally by scripts/install.sh and referenced
# by SANDBOX_BASE_IMAGE. Ships the supported CLIs, tmux (for 24/7 sessions), git and node.
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git tmux ca-certificates build-essential python3 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Preinstall the default agent CLIs (best-effort; sessions also self-install if missing).
RUN npm install -g \
        @anthropic-ai/claude-code \
        @openai/codex \
        opencode-ai \
        @google/gemini-cli \
    || true

# Non-root user — sandboxes never run as root.
RUN useradd -m -s /bin/bash coder
USER coder
WORKDIR /workspace

# Keeper process: keeps the container alive with no session attached (24/7).
CMD ["tail", "-f", "/dev/null"]
