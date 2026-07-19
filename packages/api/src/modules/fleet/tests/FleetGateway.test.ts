import { describe, expect, it, vi } from 'vitest';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import { eventBus } from '@/shared/events/EventBus';
import SessionService from '@/modules/sessions/services/SessionService';
import FleetGateway from '../gateways/FleetGateway';
import type FleetService from '../services/FleetService';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { FleetFrame } from '@cloud-code/contracts/modules/fleet/channel';
import type { Session as ContractSession } from '@cloud-code/contracts/modules/session/domain';

const framesFrom = (send: ReturnType<typeof vi.fn>): FleetFrame[] =>
    send.mock.calls.map(([raw]) => JSON.parse(raw as string) as FleetFrame);

describe('FleetGateway', () => {
    const ctx = useApp();
    void ctx;

    it('orders a snapshot and live full-session upsert, status update, and remove frames', async () => {
        const owner = await userSeed.user();
        const project = await projectSeed.project(owner);
        const send = vi.fn();
        const socket = { send } as unknown as GatewaySocket;
        const gateway = new FleetGateway();
        const sessions = new SessionService();

        await gateway.connect(owner.id, socket);
        expect(framesFrom(send)[0]).toEqual({
            type: 'fleet.snapshot',
            data: { sessions: [], revision: 1 }
        });

        const created = await sessions.create(owner.id, {
            projectId: project.id,
            cliType: 'opencode',
            title: 'Live OpenCode'
        });
        await vi.waitFor(() => {
            const upsert = framesFrom(send).find((frame) =>
                frame.type === 'fleet.session' && frame.data.session.id === created.id
            );
            expect(upsert).toMatchObject({
                type: 'fleet.session',
                data: { session: { id: created.id, status: 'starting', title: 'Live OpenCode' } }
            });
            if(upsert?.type === 'fleet.session') expect(typeof upsert.data.session.lastActiveAt).toBe('string');
        });

        await sessions.stop(owner.id, created.id);
        await vi.waitFor(() => {
            const statuses = framesFrom(send)
                .filter((frame) => frame.type === 'fleet.session' && frame.data.session.id === created.id)
                .map((frame) => frame.type === 'fleet.session' ? frame.data.session.status : null);
            expect(statuses).toContain('stopped');
        });

        await sessions.remove(owner.id, created.id);
        await vi.waitFor(() => {
            expect(framesFrom(send)).toContainEqual({
                type: 'fleet.remove',
                data: { sessionId: created.id, revision: 4 }
            });
        });

        expect(framesFrom(send).map((frame) => frame.data.revision)).toEqual([1, 2, 3, 4]);
    });
});


describe('FleetGateway ordering', () => {
    it('buffers a status delta behind the in-flight snapshot for that owner', async () => {
        let resolveSnapshot!: (sessions: ContractSession[]) => void;
        const snapshot = new Promise<ContractSession[]>((resolve) => { resolveSnapshot = resolve; });
        const liveSession: ContractSession = {
            id: 81,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:01.000Z',
            projectId: 3,
            ownerId: 987654,
            title: 'Ordered session',
            cliType: 'opencode',
            status: 'running',
            containerId: 'container',
            tmuxWindow: 'cc-81',
            cwd: '/workspace',
            lastActiveAt: '2026-01-01T00:00:01.000Z'
        };
        const fleet = {
            snapshot: vi.fn().mockReturnValue(snapshot),
            session: vi.fn().mockResolvedValue(liveSession)
        } as unknown as FleetService;
        const send = vi.fn();
        const gateway = new FleetGateway(fleet);
        const socket = { send } as unknown as GatewaySocket;

        const connecting = gateway.connect(liveSession.ownerId, socket);
        await vi.waitFor(() => expect(fleet.snapshot).toHaveBeenCalledTimes(1));
        eventBus.emit('session.status_changed', {
            sessionId: liveSession.id,
            ownerId: liveSession.ownerId,
            status: 'running'
        });
        resolveSnapshot([]);
        await connecting;

        await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        expect(framesFrom(send).map((frame) => [frame.type, frame.data.revision])).toEqual([
            ['fleet.snapshot', 1],
            ['fleet.session', 2]
        ]);
    });
});
