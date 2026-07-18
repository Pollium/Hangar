import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useApp } from '@tests/harness';
import { eventBus } from '@/shared/events/EventBus';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import Session from '../models/Session';
import SessionStatusService from '../services/SessionStatusService';
import type { TerminalFrame } from '@cloud-code/contracts/modules/session/terminal';

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

        expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'waiting_input' } });
        await vi.waitFor(() => expect(needsInput).toHaveBeenCalled());
    });

    it('decays a running session to idle after the timeout', async () => {
        const session = await makeSession();
        const frames: TerminalFrame[] = [];

        const service = new SessionStatusService();
        service.track(session, (frame) => frames.push(frame));
        service.feed(session.id, 'Running the build...');
        await vi.advanceTimersByTimeAsync(9000);

        expect(frames.some((f) => f.type === 'terminal.status' && f.data.status === 'idle')).toBe(true);
    });
});
