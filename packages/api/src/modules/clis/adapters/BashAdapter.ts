import type { CliAdapter } from './CliAdapter';

/**
 * A plain interactive shell — not a coding agent. Lets a session be a raw bash terminal in the
 * sandbox, picked the same way as the CLI agents. Needs no credentials and nothing to install
 * (bash ships in the base image). `detectStatus` is a no-op: a shell has no agent lifecycle to
 * classify, and the terminal works regardless of status.
 */
const BashAdapter: CliAdapter = {
    id: 'bash',
    label: 'Bash',
    requiredCredentials: [],

    installCommand: () => ['bash', '-lc', 'true'],
    startCommand: ({ cwd }) => ['bash', '-lc', `cd ${cwd} && exec bash`],

    detectStatus: () => null
};

export default BashAdapter;
