import { describe, expect, it, vi } from 'vitest';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import DockerService from '@/shared/services/docker/DockerService';
import SandboxService from '../services/SandboxService';
import Sandbox from '../models/Sandbox';

const fakeHandle = (id = 'container-xyz') => ({
    id,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    isRunning: vi.fn().mockResolvedValue(true),
    exec: vi.fn().mockResolvedValue({ output: '', exitCode: 0 }),
    stats: vi.fn().mockResolvedValue({ cpuPercent: 1, memUsedMb: 10, memLimitMb: 2048 })
});

const fakeDocker = () => {
    const handle = fakeHandle();
    const create = vi.fn().mockResolvedValue(handle);
    const list = vi.fn().mockResolvedValue([]);
    const docker = {
        ensureNetwork: vi.fn().mockResolvedValue(undefined),
        ensureVolume: vi.fn().mockResolvedValue(undefined),
        imageExists: vi.fn().mockResolvedValue(true),
        pull: vi.fn().mockResolvedValue(undefined),
        create,
        list,
        get: vi.fn().mockReturnValue(handle)
    } as unknown as DockerService;
    return { docker, create, list, handle };
};

const expectedResourceName = (projectId: number) => `cc-test-instance-project-${projectId}`;

describe('SandboxService', () => {
    const ctx = useApp();
    void ctx;

    it('provisions an isolated running container with hardening limits and identity labels', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const { docker, create } = fakeDocker();

        const sandbox = await new SandboxService(docker).provision(owner.id, project.id);

        expect(sandbox.status).toBe('running');
        expect(sandbox.containerId).toBe('container-xyz');
        expect(sandbox.volumeName).toBe(expectedResourceName(project.id));
        expect(create).toHaveBeenCalledOnce();
        const spec = create.mock.calls[0][0];
        expect(spec.name).toBe(expectedResourceName(project.id));
        expect(spec.volumeName).toBe(expectedResourceName(project.id));
        expect(spec.limits.pidsLimit).toBeGreaterThan(0);
        expect(spec.labels['cloud-code.instanceId']).toBe('test-instance');
        expect(spec.labels['cloud-code.owner']).toBe(String(owner.id));

        const persisted = await Sandbox.findOneBy({ projectId: project.id });
        expect(persisted?.status).toBe('running');
    });

    it('replaces an unattached legacy volume before retrying a failed provision', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        await Sandbox.create({
            projectId: project.id,
            ownerId: owner.id,
            containerId: null,
            volumeName: `cc-project-${project.id}`,
            status: 'error',
            limits: { memoryMb: 2048, cpus: 2, pidsLimit: 512 },
            lastStartedAt: null
        }).save();
        const { docker, create } = fakeDocker();

        const sandbox = await new SandboxService(docker).provision(owner.id, project.id);

        expect(sandbox.volumeName).toBe(expectedResourceName(project.id));
        expect(create.mock.calls[0][0].volumeName).toBe(expectedResourceName(project.id));
    });

    it('removes a newly created container when starting it fails', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const { docker, handle } = fakeDocker();
        handle.start.mockRejectedValueOnce(new Error('start failed'));

        await expect(new SandboxService(docker).provision(owner.id, project.id)).rejects.toMatchObject({
            message: expect.stringContaining('Sandbox::ProvisionFailed')
        });

        expect(handle.remove).toHaveBeenCalledWith(false);
        expect((await Sandbox.findOneByOrFail({ projectId: project.id })).status).toBe('error');
    });

    it('coalesces concurrent provisioning for the same project', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const { docker, create } = fakeDocker();
        const service = new SandboxService(docker);

        const [first, second] = await Promise.all([
            service.provision(owner.id, project.id),
            service.provision(owner.id, project.id)
        ]);

        expect(first.id).toBe(second.id);
        expect(create).toHaveBeenCalledOnce();
    });

    it('refuses to provision a sandbox for another user project', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        const project = await projectSeed.project(bob);
        const { docker } = fakeDocker();

        await expect(new SandboxService(docker).provision(alice.id, project.id)).rejects.toMatchObject({
            message: 'Project::Forbidden'
        });
    });

    it('stops a running sandbox', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const { docker, handle } = fakeDocker();
        const service = new SandboxService(docker);

        await service.provision(owner.id, project.id);
        const stopped = await service.stop(owner.id, project.id);

        expect(stopped.status).toBe('stopped');
        expect(handle.stop).toHaveBeenCalled();
    });
});
