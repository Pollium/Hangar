import type { SessionStatus } from '@hangar/contracts/modules/session/domain';

/**
 * A coding-agent CLI, plugged in behind a common interface. Adding a new CLI is one class
 * plus one line in the registry — sessions, tmux runtime and the terminal gateway never
 * change. `detectStatus` is best-effort: the terminal always works even if it returns null.
 */
export interface CliAdapter{
    readonly id: string;
    readonly label: string;
    /** Env var names the CLI needs (matched against the user's credentials). */
    readonly requiredCredentials: string[];

    /** Idempotent install/verify command run inside the sandbox before first start. */
    installCommand(): string[];
    /** Interactive launch command run inside the tmux window. */
    startCommand(opts: { cwd: string }): string[];
    /** Classify a recent PTY output chunk. Returns null when nothing conclusive is seen. */
    detectStatus(recentOutput: string): SessionStatus | null;
}
