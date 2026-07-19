import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type Docker from 'dockerode';
import { openPty } from '@/shared/services/docker/ExecStream';

const containerWith = (exec: object): Docker.Container =>
    ({ exec: vi.fn().mockResolvedValue(exec) }) as unknown as Docker.Container;

describe('openPty', () => {
    it('resolves the Docker exec exit code when the terminal stream closes', async () => {
        const raw = new PassThrough();
        const exec = {
            start: vi.fn().mockResolvedValue(raw),
            resize: vi.fn().mockResolvedValue(undefined),
            inspect: vi.fn().mockResolvedValue({ Running: false, ExitCode: 7 })
        };

        const pty = await openPty(containerWith(exec), ['bash']);
        raw.emit('close');

        await expect(pty.exitCode).resolves.toBe(7);
    });

    it('detects a stream that closed while exec.start was resolving', async () => {
        const raw = new PassThrough();
        const exec = {
            start: vi.fn().mockImplementation(async () => {
                raw.destroy();
                return raw;
            }),
            resize: vi.fn().mockResolvedValue(undefined),
            inspect: vi.fn().mockResolvedValue({ Running: false, ExitCode: 3 })
        };

        const pty = await openPty(containerWith(exec), ['bash']);

        await expect(pty.exitCode).resolves.toBe(3);
    });

    it('resolves null instead of hanging when Docker inspect never returns', async () => {
        const raw = new PassThrough();
        const exec = {
            start: vi.fn().mockResolvedValue(raw),
            resize: vi.fn().mockResolvedValue(undefined),
            inspect: vi.fn().mockImplementation(() => new Promise(() => undefined))
        };

        const pty = await openPty(containerWith(exec), ['bash']);
        raw.emit('close');

        await expect(pty.exitCode).resolves.toBeNull();
        expect(exec.inspect).toHaveBeenCalled();
    });
});
