import type { CliAdapter } from './CliAdapter';

const GeminiAdapter: CliAdapter = {
    id: 'gemini',
    label: 'Gemini CLI',
    requiredCredentials: ['GEMINI_API_KEY'],

    installCommand: () => ['bash', '-lc', 'command -v gemini >/dev/null 2>&1 || npm i -g @google/gemini-cli@0.51.0'],
    startCommand: ({ cwd }) => ['bash', '-lc', `cd ${cwd} && gemini`],

    detectStatus: (out) => {
        if(/\(y\/n\)|allow|approve|confirm/i.test(out)) return 'waiting_input';
        if(/thinking|loading|running/i.test(out)) return 'running';
        return null;
    }
};

export default GeminiAdapter;
