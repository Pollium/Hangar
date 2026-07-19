import type { CliAdapter } from './CliAdapter';

const ClaudeCodeAdapter: CliAdapter = {
    id: 'claude-code',
    label: 'Claude Code',
    requiredCredentials: ['ANTHROPIC_API_KEY'],

    installCommand: () => ['bash', '-lc', 'command -v claude >/dev/null 2>&1 || npm i -g @anthropic-ai/claude-code@2.1.214'],
    startCommand: ({ cwd }) => ['bash', '-lc', `cd ${cwd} && claude`],

    detectStatus: (out) => {
        if(/Do you want to proceed|Permission|\(y\/n\)|❯ \d\./i.test(out)) return 'waiting_input';
        if(/esc to interrupt|Running|Thinking|Working/i.test(out)) return 'running';
        return null;
    }
};

export default ClaudeCodeAdapter;
