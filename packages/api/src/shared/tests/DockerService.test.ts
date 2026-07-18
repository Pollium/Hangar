import { describe, expect, it, vi } from 'vitest';
import type Docker from 'dockerode';
import DockerService from '@/shared/services/docker/DockerService';
import type { CreateContainerSpec } from '@/shared/services/docker/contracts';

const spec = (): CreateContainerSpec => ({
    image: 'cloud-code/sandbox-base:ubuntu',
    name: 'cc-project-1',
    env: ['ANTHROPIC_API_KEY=sk-test'],
    labels: { 'cloud-code.projectId': '1', 'cloud-code.owner': '3' },
    workdir: '/workspace',
    volumeName: 'cc-vol-1',
    limits: { memoryMb: 2048, cpus: 2, pidsLimit: 512 },
    network: 'cloud-code-sandboxes',
    keeperCommand: ['tail', '-f', '/dev/null']
});

describe('DockerService.create hardening', () => {
    it('applies the security baseline to the HostConfig', async () => {
        const createContainer = vi.fn().mockResolvedValue({ id: 'abc123' });
        const docker = { createContainer } as unknown as Docker;

        await new DockerService(docker).create(spec());

        expect(createContainer).toHaveBeenCalledOnce();
        const opts = createContainer.mock.calls[0][0];
        expect(opts.HostConfig.CapDrop).toEqual(['ALL']);
        expect(opts.HostConfig.SecurityOpt).toContain('no-new-privileges');
        expect(opts.HostConfig.PidsLimit).toBe(512);
        expect(opts.HostConfig.Memory).toBe(2048 * 1_048_576);
        expect(opts.HostConfig.NanoCpus).toBe(2e9);
        expect(opts.HostConfig.NetworkMode).toBe('cloud-code-sandboxes');
        expect(opts.HostConfig.Binds).toEqual(['cc-vol-1:/workspace']);
        // The docker socket must never be bind-mounted into a sandbox.
        expect(JSON.stringify(opts.HostConfig.Binds)).not.toContain('docker.sock');
    });
});
