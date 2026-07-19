# Base environment agents run inside. Built locally by scripts/install.sh and referenced
# by SANDBOX_BASE_IMAGE. Ships the supported CLIs, tmux (for 24/7 sessions), git and node.
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git tmux ca-certificates build-essential python3 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Non-root user — sandboxes never run as root. Its npm prefix is writable so the idempotent
# adapter install check can repair an accidentally missing CLI without privilege escalation.
RUN useradd -m -s /bin/bash coder
ENV NPM_CONFIG_PREFIX=/home/coder/.npm-global
ENV PATH=/home/coder/.npm-global/bin:${PATH}
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
USER coder

# Pin every global CLI for reproducible sandbox builds; a missing/broken package fails the image.
RUN npm install -g \
        @anthropic-ai/claude-code@2.1.214 \
        @openai/codex@0.144.5 \
        opencode-ai@1.18.3 \
        @google/gemini-cli@0.51.0 \
    && command -v claude \
    && command -v codex \
    && command -v opencode \
    && command -v gemini

WORKDIR /workspace

# Keeper process: keeps the container alive with no session attached (24/7).
CMD ["tail", "-f", "/dev/null"]
