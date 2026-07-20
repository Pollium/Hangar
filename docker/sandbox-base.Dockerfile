# Base environment agents run inside. Built locally by scripts/install.sh and referenced
# by SANDBOX_BASE_IMAGE. Ships the supported CLIs, tmux (for 24/7 sessions), git, node, and
# code-server (the per-project Codespace, launched on demand inside the container).
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git tmux ca-certificates build-essential python3 \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# code-server (VS Code in the browser). Installed system-wide as root so it lands on PATH
# for the non-root `coder` user; it runs bound to the internal sandbox network only and is
# never published to the host — the API reverse-proxies it with a per-project auth gate.
RUN curl -fsSL https://code-server.dev/install.sh | sh \
    && command -v code-server

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

# tmux config for the agent CLIs (Ink-based TUIs). Truecolor passthrough so 24-bit palettes reach
# xterm.js; tmux-256color as the inner TERM; a short escape-time so ESC-driven keybindings in the
# CLIs feel native instead of lagging behind tmux's default 500ms.
RUN printf '%s\n' \
        'set -g default-terminal "tmux-256color"' \
        'set -ga terminal-overrides ",*:Tc"' \
        'set -sg escape-time 10' \
        'set -g focus-events on' \
        > /home/coder/.tmux.conf

WORKDIR /workspace

# Keeper process: keeps the container alive with no session attached (24/7).
CMD ["tail", "-f", "/dev/null"]
