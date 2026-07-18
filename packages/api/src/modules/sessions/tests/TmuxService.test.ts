import { describe, expect, it, vi } from 'vitest';
import TmuxService from '../services/TmuxService';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';

const handleWith = (execImpl: (cmd: string[]) => { output: string; exitCode: number }) => {
    const exec = vi.fn(async (cmd: string[]) => execImpl(cmd));
    return { handle: { exec } as unknown as ContainerHandle, exec };
};

describe('TmuxService', () => {
    it('creates a detached session with env flags and the start command', async () => {
        const tmux = new TmuxService();
        // has-session returns non-zero (missing) so ensureSession creates it
        const { handle, exec } = handleWith((cmd) => ({ output: '', exitCode: cmd[1] === 'has-session' ? 1 : 0 }));

        await tmux.ensureSession(
            handle,
            'cc-7',
            ['bash', '-lc', 'cd /workspace && claude'],
            ['ANTHROPIC_API_KEY=sk-x'],
            '/workspace'
        );

        const newSession = exec.mock.calls.map((c) => c[0]).find((cmd) => cmd[1] === 'new-session');
        expect(newSession).toBeDefined();
        expect(newSession).toEqual([
            'tmux', 'new-session', '-d', '-s', 'cc-7', '-c', '/workspace',
            '-e', 'ANTHROPIC_API_KEY=sk-x',
            'bash', '-lc', 'cd /workspace && claude'
        ]);
    });

    it('does not recreate an existing session', async () => {
        const tmux = new TmuxService();
        const { handle, exec } = handleWith(() => ({ output: '', exitCode: 0 })); // has-session succeeds

        await tmux.ensureSession(handle, 'cc-7', ['bash'], [], '/workspace');

        expect(exec.mock.calls.some((c) => c[0][1] === 'new-session')).toBe(false);
    });

    it('captures the pane snapshot', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({ output: cmd[1] === 'capture-pane' ? 'screen text' : '', exitCode: 0 }));

        expect(await tmux.capture(handle, 'cc-7')).toBe('screen text');
    });
});
