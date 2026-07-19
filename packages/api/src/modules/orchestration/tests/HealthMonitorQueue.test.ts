import { describe, expect, it, vi } from 'vitest';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import type DockerService from '@/shared/services/docker/DockerService';
import HealthMonitorQueue from '../queues/HealthMonitorQueue';
import Session from '@/modules/sessions/models/Session';
import Sandbox from '@/modules/sandboxes/models/Sandbox';

const makeSession = async (): Promise<Session> => {
    const owner = await userSeed.user();
    const project = await projectSeed.project(owner);
    return Session.create({
        projectId: project.id,
        ownerId: owner.id,
        title: 'Monitor test',
        cliType: 'opencode',
        status: 'running',
        containerId: 'container-timeout',
        tmuxWindow: 'cc-monitor',
        cwd: '/workspace',
        lastActiveAt: new Date()
    }).save() as Promise<Session>;
};

describe('HealthMonitorQueue', () => {
    const ctx = useApp();
    void ctx;

    it('does not mark a session error when Docker inspect fails transiently', async () => {
        const session = await makeSession();
        const exec = vi.fn();
        const docker = {
            get: vi.fn().mockReturnValue({
                isRunning: vi.fn().mockRejectedValue(new Error('docker timeout')),
                exec
            })
        } as unknown as DockerService;

        await new HealthMonitorQueue(docker).process();

        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('running');
        expect(exec).not.toHaveBeenCalled();
    });

    it('does not mark a session error for an unknown tmux probe code', async () => {
        const session = await makeSession();
        const docker = {
            get: vi.fn().mockReturnValue({
                isRunning: vi.fn().mockResolvedValue(true),
                exec: vi.fn().mockResolvedValue({ output: 'tmux unavailable', exitCode: 127 })
            })
        } as unknown as DockerService;

        await new HealthMonitorQueue(docker).process();

        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('running');
    });

    it('does not overwrite a sandbox that restarted while its old container was probed', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const sandbox = await Sandbox.create({
            projectId: project.id,
            ownerId: owner.id,
            containerId: 'old-container',
            volumeName: 'monitor-volume',
            status: 'running',
            limits: { memoryMb: 512, cpus: 1, pidsLimit: 128 },
            lastStartedAt: new Date('2026-01-01T00:00:00.000Z')
        }).save() as Sandbox;
        let resolveProbe!: (running: boolean) => void;
        const probe = new Promise<boolean>((resolve) => { resolveProbe = resolve; });
        const isRunning = vi.fn().mockReturnValue(probe);
        const docker = {
            get: vi.fn().mockReturnValue({ isRunning })
        } as unknown as DockerService;

        const checking = new HealthMonitorQueue(docker).process();
        await vi.waitFor(() => expect(isRunning).toHaveBeenCalledTimes(1));
        const restarted = await Sandbox.findOneByOrFail({ id: sandbox.id });
        restarted.containerId = 'new-container';
        restarted.status = 'running';
        restarted.lastStartedAt = new Date('2026-01-01T00:00:10.000Z');
        await restarted.save();
        resolveProbe(false);
        await checking;

        const persisted = await Sandbox.findOneByOrFail({ id: sandbox.id });
        expect(persisted.status).toBe('running');
        expect(persisted.containerId).toBe('new-container');
        expect(persisted.lastStartedAt?.toISOString()).toBe('2026-01-01T00:00:10.000Z');
    });
});
