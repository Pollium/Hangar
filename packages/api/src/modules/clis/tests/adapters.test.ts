import { describe, expect, it } from 'vitest';
import { getAdapter, listAdapters } from '../adapters/registry';

describe('CLI adapter registry', () => {
    it('registers the built-in adapters', () => {
        const ids = listAdapters().map((a) => a.id);
        expect(ids).toEqual(expect.arrayContaining(['claude-code', 'codex', 'opencode', 'gemini']));
    });

    it('throws a typed error for an unknown cli', () => {
        expect(() => getAdapter('nope')).toThrowError(/Cli::UnknownCli/);
    });

    it('builds the claude-code start command for a working directory', () => {
        const cmd = getAdapter('claude-code').startCommand({ cwd: '/workspace' });
        expect(cmd.join(' ')).toContain('cd /workspace && claude');
    });

    it('uses a private executable temp directory for OpenCode native rendering', () => {
        const cmd = getAdapter('opencode').startCommand({ cwd: '/workspace' }).join(' ');
        expect(cmd).toContain('$HOME/.cache/opencode/tmp');
        expect(cmd).toContain('TMPDIR=');
        expect(cmd).toContain('opencode');
    });

    it('detects a waiting-for-input prompt', () => {
        const status = getAdapter('claude-code').detectStatus('Do you want to proceed? (y/n)');
        expect(status).toBe('waiting_input');
    });

    it('returns null when output is inconclusive', () => {
        expect(getAdapter('claude-code').detectStatus('just some log line')).toBeNull();
    });
});
