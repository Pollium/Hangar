import { describe, expect, it, vi } from 'vitest';
import type Docker from 'dockerode';
import ContainerHandle from '@/shared/services/docker/ContainerHandle';

const handleWithInspect = (inspect: () => Promise<unknown>): ContainerHandle => {
    const container = { id: 'container-1', inspect } as unknown as Docker.Container;
    return new ContainerHandle(container);
};

describe('ContainerHandle.isRunning', () => {
    it('returns false for a confirmed Docker 404', async () => {
        const missing = Object.assign(new Error('not found'), { statusCode: 404 });
        const handle = handleWithInspect(vi.fn().mockRejectedValue(missing));

        await expect(handle.isRunning()).resolves.toBe(false);
    });

    it('propagates transport errors instead of reporting the container down', async () => {
        const handle = handleWithInspect(vi.fn().mockRejectedValue(new Error('docker timeout')));

        await expect(handle.isRunning()).rejects.toThrow('docker timeout');
    });
});
