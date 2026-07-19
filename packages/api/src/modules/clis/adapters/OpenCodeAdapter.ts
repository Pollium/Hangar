import type { CliAdapter } from './CliAdapter';

const OpenCodeAdapter: CliAdapter = {
    id: 'opencode',
    label: 'OpenCode',
    requiredCredentials: ['ANTHROPIC_API_KEY'],

    installCommand: () => ['bash', '-lc', 'command -v opencode >/dev/null 2>&1 || npm i -g opencode-ai@1.18.3'],
    startCommand: ({ cwd }) => [
        'bash',
        '-lc',
        `cd ${cwd} && mkdir -p "$HOME/.cache/opencode/tmp" && chmod 700 "$HOME/.cache/opencode/tmp" && exec env TMPDIR="$HOME/.cache/opencode/tmp" opencode`
    ],

    detectStatus: (out) => {
        if(/\(y\/n\)|confirm|approve/i.test(out)) return 'waiting_input';
        if(/thinking|generating|running/i.test(out)) return 'running';
        return null;
    }
};

export default OpenCodeAdapter;
