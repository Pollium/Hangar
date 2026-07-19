import { describe, expect, it, vi } from 'vitest';
import TmuxService from '../services/TmuxService';
import type ContainerHandle from '@/shared/services/docker/ContainerHandle';

const handleWith = (execImpl: (cmd: string[]) => { output: string; exitCode: number }) => {
    const exec = vi.fn(async (cmd: string[]) => execImpl(cmd));
    return { handle: { exec } as unknown as ContainerHandle, exec };
};

describe('TmuxService', () => {
    it('creates a detached session with exact env flags and the start command', async () => {
        const tmux = new TmuxService();
        let created = false;
        const { handle, exec } = handleWith((cmd) => {
            if(cmd[1] === 'has-session') return { output: '', exitCode: created ? 0 : 1 };
            if(cmd[1] === 'new-session') created = true;
            return { output: '', exitCode: 0 };
        });

        await tmux.ensureSession(
            handle,
            'cc-7',
            ['bash', '-lc', 'cd /workspace && claude'],
            ['ANTHROPIC_API_KEY=sk-x', 'custom_value=  value=with spaces  '],
            '/workspace',
            { cols: 180, rows: 52 }
        );

        const newSession = exec.mock.calls.map((call) => call[0]).find((cmd) => cmd[1] === 'new-session');
        expect(newSession).toEqual([
            'tmux', 'new-session', '-d', '-s', 'cc-7', '-x', '180', '-y', '52', '-c', '/workspace',
            '-e', 'ANTHROPIC_API_KEY=sk-x',
            '-e', 'custom_value=  value=with spaces  ',
            'bash', '-lc', 'cd /workspace && claude'
        ]);
    });

    it('does not recreate an existing session', async () => {
        const tmux = new TmuxService();
        const { handle, exec } = handleWith(() => ({ output: '', exitCode: 0 }));

        await tmux.ensureSession(handle, 'cc-7', ['bash'], [], '/workspace');

        expect(exec.mock.calls.some((call) => call[0][1] === 'new-session')).toBe(false);
    });

    it('rejects a non-zero tmux new-session result', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({ output: 'failed', exitCode: cmd[1] === 'has-session' ? 1 : 2 }));

        await expect(tmux.ensureSession(handle, 'cc-7', ['bash'], [], '/workspace')).rejects.toMatchObject({
            message: 'Docker::ExecFailed:tmux-new-session'
        });
    });

    it('rejects an agent process that exits immediately after tmux creation', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({
            output: '',
            exitCode: cmd[1] === 'has-session' ? 1 : 0
        }));

        await expect(tmux.ensureSession(handle, 'cc-7', ['bash'], [], '/workspace')).rejects.toMatchObject({
            message: 'Docker::ExecFailed:tmux-session-exited'
        });
    });

    it('serializes concurrent creation of the same tmux session', async () => {
        const tmux = new TmuxService();
        let created = false;
        const exec = vi.fn(async (cmd: string[]) => {
            if(cmd[1] === 'has-session') return { output: '', exitCode: created ? 0 : 1 };
            if(cmd[1] === 'new-session'){
                await new Promise((resolve) => setTimeout(resolve, 5));
                created = true;
            }
            return { output: '', exitCode: 0 };
        });
        const handle = { id: 'container-concurrent', exec } as unknown as ContainerHandle;

        await Promise.all([
            tmux.ensureSession(handle, 'cc-9', ['bash'], [], '/workspace'),
            tmux.ensureSession(handle, 'cc-9', ['bash'], [], '/workspace')
        ]);

        expect(exec.mock.calls.filter((call) => call[0][1] === 'new-session')).toHaveLength(1);
    });

    it('rejects an unknown tmux probe exit code', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith(() => ({ output: 'tmux missing', exitCode: 127 }));

        await expect(tmux.hasSession(handle, 'cc-7')).rejects.toMatchObject({
            message: 'Docker::ExecFailed:tmux-has-session'
        });
    });

    it('rejects kill-session when tmux still reports the session alive', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({
            output: 'kill failed',
            exitCode: cmd[1] === 'kill-session' ? 2 : 0
        }));

        await expect(tmux.kill(handle, 'cc-7')).rejects.toMatchObject({
            message: 'Docker::ExecFailed:tmux-kill-session'
        });
    });

    it('accepts a failed kill when tmux confirms the session already disappeared', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({
            output: '',
            exitCode: cmd[1] === 'kill-session' ? 1 : 1
        }));

        await expect(tmux.kill(handle, 'cc-7')).resolves.toBeUndefined();
    });

    it('resizes an existing tmux window to the browser dimensions', async () => {
        const tmux = new TmuxService();
        const { handle, exec } = handleWith(() => ({ output: '', exitCode: 0 }));

        await tmux.resizeWindow(handle, 'cc-7', { cols: 196, rows: 61 });

        expect(exec).toHaveBeenCalledWith([
            'tmux', 'resize-window', '-t', 'cc-7', '-x', '196', '-y', '61'
        ]);
    });

    it('captures the pane snapshot', async () => {
        const tmux = new TmuxService();
        const { handle } = handleWith((cmd) => ({ output: cmd[1] === 'capture-pane' ? 'screen text' : '', exitCode: 0 }));

        expect(await tmux.capture(handle, 'cc-7')).toBe('screen text');
    });
});
