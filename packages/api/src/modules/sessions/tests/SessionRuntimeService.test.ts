import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import type SandboxService from '@/modules/sandboxes/services/SandboxService';
import type CredentialService from '@/modules/credentials/services/CredentialService';
import type { IContainerHandle } from '@/shared/services/docker/contracts';
import type { PtyStream } from '@/shared/services/docker/contracts';
import Session from '../models/Session';
import SessionRuntimeService from '../services/SessionRuntimeService';
import type TmuxService from '../services/TmuxService';

const makeSession = async (status: Session['status'] = 'running'): Promise<Session> => {
    const owner = await userSeed.user();
    const project = await projectSeed.project(owner);
    return Session.create({
        projectId: project.id,
        ownerId: owner.id,
        title: 'Runtime test',
        cliType: 'opencode',
        status,
        containerId: 'container-1',
        tmuxWindow: 'cc-runtime',
        cwd: '/workspace',
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z')
    }).save() as Promise<Session>;
};

const runtimeWith = (hasSession = true) => {
    const pty = new PassThrough() as unknown as PtyStream;
    pty.resize = vi.fn();
    pty.exitCode = new Promise<number | null>(() => undefined);
    const handle = { id: 'container-1' } as IContainerHandle;
    const sandboxes = {
        ensureRunning: vi.fn().mockResolvedValue({ handle, sandbox: {} })
    } as unknown as SandboxService;
    const credentials = {
        resolveEnvFor: vi.fn().mockResolvedValue([])
    } as unknown as CredentialService;
    let alive = hasSession;
    const tmux = {
        name: vi.fn((id: number) => `cc-${id}`),
        hasSession: vi.fn().mockImplementation(async () => alive),
        ensureSession: vi.fn().mockResolvedValue(undefined),
        resizeWindow: vi.fn().mockResolvedValue(undefined),
        capture: vi.fn().mockResolvedValue('screen'),
        attach: vi.fn().mockResolvedValue(pty),
        kill: vi.fn().mockImplementation(async () => { alive = false; })
    } as unknown as TmuxService;
    return { runtime: new SessionRuntimeService(sandboxes, credentials, tmux), sandboxes, credentials, tmux };
};

describe('SessionRuntimeService', () => {
    const ctx = useApp();
    void ctx;

    it('preserves waiting_input and activity when snapshot and attach reuse a healthy tmux', async () => {
        const session = await makeSession('waiting_input');
        const activity = session.lastActiveAt?.getTime();
        const { runtime, credentials, tmux } = runtimeWith(true);

        expect(await runtime.snapshot(session, { cols: 190, rows: 58 })).toBe('screen');
        await runtime.attach(session);

        const persisted = await Session.findOneByOrFail({ id: session.id });
        expect(persisted.status).toBe('waiting_input');
        expect(persisted.lastActiveAt?.getTime()).toBe(activity);
        expect(credentials.resolveEnvFor).not.toHaveBeenCalled();
        expect(tmux.ensureSession).not.toHaveBeenCalled();
        expect(tmux.resizeWindow).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'container-1' }),
            `cc-${session.id}`,
            { cols: 190, rows: 58 }
        );
    });

    it('resizes an existing tmux window without changing lifecycle status', async () => {
        const session = await makeSession('waiting_input');
        const { runtime, tmux } = runtimeWith(true);

        await runtime.resize(session, { cols: 180, rows: 52 });

        expect(tmux.resizeWindow).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'container-1' }),
            session.tmuxWindow,
            { cols: 180, rows: 52 }
        );
        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('waiting_input');
    });

    it('kills tmux, persists stopped, and rejects a start fetched before stop', async () => {
        const session = await makeSession('running');
        const stale = await Session.findOneByOrFail({ id: session.id });
        const { runtime, sandboxes, tmux } = runtimeWith(true);
        const released = vi.fn();

        const stopped = await runtime.stop(session, released);

        expect(stopped.status).toBe('stopped');
        expect(released).toHaveBeenCalledTimes(1);
        expect(tmux.kill).toHaveBeenCalledTimes(1);
        const ensureCallsAfterStop = vi.mocked(sandboxes.ensureRunning).mock.calls.length;
        await expect(runtime.start(stale)).rejects.toMatchObject({ message: 'Session::NotRunning' });
        expect(vi.mocked(sandboxes.ensureRunning).mock.calls).toHaveLength(ensureCallsAfterStop);
        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('stopped');
    });

    it('kills tmux and removes the row atomically from later starts', async () => {
        const session = await makeSession('running');
        const stale = await Session.findOneByOrFail({ id: session.id });
        const { runtime, tmux } = runtimeWith(true);

        await runtime.remove(session);

        expect(tmux.kill).toHaveBeenCalledTimes(1);
        expect(await Session.findOneBy({ id: session.id })).toBeNull();
        await expect(runtime.start(stale)).rejects.toMatchObject({ message: 'Session::NotFound' });
    });

    it('keeps the row active when Docker cannot confirm tmux termination', async () => {
        const session = await makeSession('running');
        const { runtime, sandboxes } = runtimeWith(true);
        const released = vi.fn();
        vi.mocked(sandboxes.ensureRunning).mockRejectedValue(new Error('docker timeout'));

        await expect(runtime.stop(session, released)).rejects.toThrow('docker timeout');
        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('running');

        await expect(runtime.remove(session, released)).rejects.toThrow('docker timeout');
        expect(await Session.findOneBy({ id: session.id })).not.toBeNull();
        expect(released).not.toHaveBeenCalled();
    });
});
