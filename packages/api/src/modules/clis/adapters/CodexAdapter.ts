import type { CliAdapter } from './CliAdapter';

const CodexAdapter: CliAdapter = {
    id: 'codex',
    label: 'Codex',
    requiredCredentials: ['OPENAI_API_KEY'],

    installCommand: () => ['bash', '-lc', 'command -v codex >/dev/null 2>&1 || npm i -g @openai/codex@0.144.5'],
    startCommand: ({ cwd }) => ['bash', '-lc', `cd ${cwd} && codex`],

    detectStatus: (out) => {
        if(/allow this command|Approve|\(y\/n\)|\[y\/N\]/i.test(out)) return 'waiting_input';
        if(/thinking|working|running/i.test(out)) return 'running';
        return null;
    }
};

export default CodexAdapter;
