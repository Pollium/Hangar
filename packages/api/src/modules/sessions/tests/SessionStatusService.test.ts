import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { UpdateQueryBuilder } from 'typeorm';
import { useApp } from '@tests/harness';
import { eventBus } from '@/shared/events/EventBus';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import Session from '../models/Session';
import SessionStatusService from '../services/SessionStatusService';
import type { TerminalFrame } from '@hangar/contracts/modules/session/terminal';

const makeSession = async () => {
    const owner = await userSeed.user();
    const project = await projectSeed.project(owner);
    const entity = Session.create({
        projectId: project.id,
        ownerId: owner.id,
        title: 'test',
        cliType: 'claude-code',
        status: 'running',
        containerId: 'c1',
        tmuxWindow: 'cc-1',
        cwd: '/workspace',
        lastActiveAt: new Date()
    });
    return entity.save() as Promise<Session>;
};

describe('SessionStatusService', () => {
    const ctx = useApp();
    void ctx;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('transitions to waiting_input and emits needs_input on a permission prompt', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const needsInput = vi.fn();
        eventBus.subscribe('session.needs_input', needsInput);

        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));
        service.feed(session.id, 'Do you want to proceed? (y/n)');

        await vi.waitFor(() => {
            expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'waiting_input' } });
            expect(needsInput).toHaveBeenCalled();
        });
    });

    it('retries a transient status persistence failure', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));
        const execute = vi.spyOn(UpdateQueryBuilder.prototype, 'execute')
            .mockRejectedValueOnce(new Error('database busy'));

        try{
            service.feed(session.id, 'Do you want to proceed? (y/n)');
            await vi.waitFor(() => {
                expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'waiting_input' } });
            });
            expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('waiting_input');
        }finally{
            execute.mockRestore();
            service.untrack(session.id);
        }
    });

    it('allows the same status to retry after both persistence attempts fail', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));
        const execute = vi.spyOn(UpdateQueryBuilder.prototype, 'execute')
            .mockRejectedValueOnce(new Error('database busy'))
            .mockRejectedValueOnce(new Error('database still busy'));

        try{
            service.feed(session.id, 'Do you want to proceed? (y/n)');
            await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
            await Promise.resolve();
            service.feed(session.id, 'Do you want to proceed? (y/n)');
            await vi.waitFor(() => {
                expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'waiting_input' } });
            });
        }finally{
            execute.mockRestore();
            service.untrack(session.id);
        }
    });

    it('preserves back-to-back waiting_input and running transitions', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));

        service.feed(session.id, 'Do you want to proceed? (y/n)');
        service.feed(session.id, 'Running the build...');

        await vi.waitFor(() => {
            const statuses = frames
                .filter((frame) => frame.type === 'terminal.status')
                .map((frame) => frame.data.status);
            expect(statuses).toEqual(['waiting_input', 'running']);
        });
        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('running');
        service.untrack(session.id);
    });

    it('decays a running session to idle after the timeout', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];

        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));
        service.feed(session.id, 'Running the build...');
        await vi.advanceTimersByTimeAsync(9000);

        await vi.waitFor(() => {
            expect(frames.some((f) => f.type === 'terminal.status' && f.data.status === 'idle')).toBe(true);
        });
    });
});
