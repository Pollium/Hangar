import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { UpdateQueryBuilder } from 'typeorm';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';
import TerminalBridge from '../services/TerminalBridge';
import Session from '../models/Session';
import SessionEvent from '../models/SessionEvent';
import type SessionRuntimeService from '../services/SessionRuntimeService';
import type { PtyStream } from '@/shared/services/docker/contracts';
import type { TerminalFrame } from '@hangar/contracts/modules/session/terminal';

const makeStream = (exitCode: Promise<number | null>): PtyStream => {
    const stream = new PassThrough() as unknown as PtyStream;
    stream.resize = vi.fn();
    stream.exitCode = exitCode;
    return stream;
};

const makeSession = async (): Promise<Session> => {
    const owner = await userSeed.user();
    const project = await projectSeed.project(owner);
    return Session.create({
        projectId: project.id,
        ownerId: owner.id,
        title: 'OpenCode test',
        cliType: 'opencode',
        status: 'running',
        containerId: 'container-1',
        tmuxWindow: 'cc-42',
        cwd: '/workspace',
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z')
    }).save() as Promise<Session>;
};

describe('TerminalBridge', () => {
    const ctx = useApp();
    void ctx;

    it('marks the persisted session error and publishes the real code when the CLI exits', async () => {
        const stream = makeStream(Promise.resolve(1));
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, (frame) => frames.push(frame));

        stream.emit('close');

        await vi.waitFor(async () => {
            const persisted = await Session.findOneByOrFail({ id: session.id });
            expect(persisted.status).toBe('error');
        });
        expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'error' } });
        expect(frames).toContainEqual({ type: 'terminal.exit', data: { code: 1 } });
    });

    it('creates a fresh attachment on Retry and ignores the old delayed close', async () => {
        let resolveOldExit!: (code: number | null) => void;
        const oldExit = new Promise<number | null>((resolve) => { resolveOldExit = resolve; });
        const first = makeStream(oldExit);
        const second = makeStream(new Promise<number | null>(() => undefined));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const runtime = {
            attach: vi.fn()
                .mockResolvedValueOnce(first)
                .mockResolvedValueOnce(second),
            snapshot: vi.fn().mockImplementation(async (current: Session) => {
                current.status = 'running';
                current.lastActiveAt = new Date('2026-01-01T00:00:01.000Z');
                await current.save();
                return 'retry snapshot';
            })
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, (frame) => frames.push(frame));

        first.emit('close');
        await bridge.snapshot(session);
        await bridge.subscribe(session, (frame) => frames.push(frame));
        resolveOldExit(1);

        await vi.waitFor(() => expect(runtime.attach).toHaveBeenCalledTimes(2));
        const persisted = await Session.findOneByOrFail({ id: session.id });
        expect(persisted.status).toBe('running');
        expect(frames).not.toContainEqual({ type: 'terminal.status', data: { status: 'error' } });
        expect(frames).not.toContainEqual({ type: 'terminal.exit', data: { code: 1 } });

        await bridge.release(session.id);
    });

    it('reuses one generation when a snapshot arrives while attach is pending', async () => {
        let resolveAttach!: (stream: PtyStream) => void;
        const attachResult = new Promise<PtyStream>((resolve) => { resolveAttach = resolve; });
        const stream = makeStream(Promise.resolve(9));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const runtime = {
            attach: vi.fn().mockReturnValue(attachResult),
            snapshot: vi.fn().mockResolvedValue('concurrent snapshot')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);

        const subscribing = bridge.subscribe(session, (frame) => frames.push(frame));
        await vi.waitFor(() => expect(runtime.attach).toHaveBeenCalledTimes(1));
        expect(await bridge.snapshot(session)).toBe('concurrent snapshot');
        resolveAttach(stream);
        await subscribing;
        stream.emit('close');

        await vi.waitFor(() => {
            expect(frames).toContainEqual({ type: 'terminal.exit', data: { code: 9 } });
        });
        expect((await Session.findOneByOrFail({ id: session.id })).status).toBe('error');
    });

    it('releases the current PTY while an older generation is still closing', async () => {
        let resolveOldExit!: (code: number | null) => void;
        const first = makeStream(new Promise<number | null>((resolve) => { resolveOldExit = resolve; }));
        const second = makeStream(new Promise<number | null>(() => undefined));
        const session = await makeSession();
        const runtime = {
            attach: vi.fn()
                .mockResolvedValueOnce(first)
                .mockResolvedValueOnce(second),
            snapshot: vi.fn().mockImplementation(async (current: Session) => {
                current.status = 'running';
                current.lastActiveAt = new Date('2026-01-01T00:00:02.000Z');
                await current.save();
                return 'replacement';
            })
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, vi.fn());
        first.emit('close');
        await bridge.snapshot(session);
        await bridge.subscribe(session, vi.fn());
        second.emit('data', Buffer.from('replacement buffered output'));

        const releasing = bridge.release(session.id);
        expect(second.writableEnded).toBe(true);
        resolveOldExit(1);
        await releasing;

        const events = await SessionEvent.findBy({ sessionId: session.id });
        expect(events.map(({ data }) => data)).toContain('replacement buffered output');
        expect(runtime.attach).toHaveBeenCalledTimes(2);
    });

    it('flushes buffered transcript before release resolves', async () => {
        const stream = makeStream(new Promise<number | null>(() => undefined));
        const session = await makeSession();
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, vi.fn());
        stream.emit('data', Buffer.from('final buffered output'));

        await bridge.release(session.id);

        const events = await SessionEvent.findBy({ sessionId: session.id });
        expect(events.map(({ data }) => data)).toContain('final buffered output');
    });

    it('still publishes terminal.exit when the health monitor marked error first', async () => {
        const stream = makeStream(Promise.resolve(137));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, (frame) => frames.push(frame));
        await Session.createQueryBuilder()
            .update(Session)
            .set({ status: 'error', lastActiveAt: new Date() })
            .where('id = :id', { id: session.id })
            .execute();

        stream.emit('close');

        await vi.waitFor(() => {
            expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'error' } });
            expect(frames).toContainEqual({ type: 'terminal.exit', data: { code: 137 } });
        });
    });

    it('coalesces live resizes while propagating the latest dimensions to tmux', async () => {
        const stream = makeStream(new Promise<number | null>(() => undefined));
        const session = await makeSession();
        let resolveFirst!: () => void;
        const firstResize = new Promise<void>((resolve) => { resolveFirst = resolve; });
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue(''),
            resize: vi.fn()
                .mockReturnValueOnce(firstResize)
                .mockResolvedValue(undefined)
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, vi.fn());

        bridge.resize(session.id, 100, 30);
        bridge.resize(session.id, 120, 40);
        bridge.resize(session.id, 180, 52);
        expect(stream.resize).toHaveBeenCalledTimes(3);
        expect(runtime.resize).toHaveBeenCalledTimes(1);

        resolveFirst();
        await vi.waitFor(() => {
            expect(runtime.resize).toHaveBeenCalledTimes(2);
            expect(runtime.resize).toHaveBeenLastCalledWith(session, { cols: 180, rows: 52 });
        });
        await bridge.release(session.id);
    });

    it('emits exit and releases viewers after two CAS misses', async () => {
        const stream = makeStream(Promise.resolve(137));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const released = vi.fn();
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        bridge.onRelease(released);
        await bridge.subscribe(session, (frame) => frames.push(frame));
        const execute = vi.spyOn(UpdateQueryBuilder.prototype, 'execute')
            .mockResolvedValueOnce({ affected: 0, raw: [], generatedMaps: [] })
            .mockResolvedValueOnce({ affected: 0, raw: [], generatedMaps: [] });

        try{
            stream.emit('close');
            await vi.waitFor(() => {
                expect(frames).toContainEqual({ type: 'terminal.exit', data: { code: 137 } });
                expect(released).toHaveBeenCalledWith(session.id, 'exit');
            });
        }finally{
            execute.mockRestore();
        }
    });

    it('decodes a multibyte UTF-8 character split across PTY chunks', async () => {
        const stream = makeStream(new Promise<number | null>(() => undefined));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, (frame) => frames.push(frame));

        const glyph = Buffer.from('🦊');
        stream.emit('data', glyph.subarray(0, 2));
        expect(frames).toEqual([]);
        stream.emit('data', glyph.subarray(2));

        expect(frames).toContainEqual({ type: 'terminal.output', data: { chunk: '🦊' } });
        expect(JSON.stringify(frames)).not.toContain('�');
        await bridge.release(session.id);
    });

    it('publishes terminal.exit when error persistence itself fails', async () => {
        const stream = makeStream(Promise.resolve(70));
        const session = await makeSession();
        const frames: TerminalFrame[] = [];
        const runtime = {
            attach: vi.fn().mockResolvedValue(stream),
            snapshot: vi.fn().mockResolvedValue('')
        } as unknown as SessionRuntimeService;
        const bridge = new TerminalBridge(runtime);
        await bridge.subscribe(session, (frame) => frames.push(frame));
        const lookup = vi.spyOn(Session, 'findOneBy').mockRejectedValueOnce(new Error('database unavailable'));

        stream.emit('close');

        await vi.waitFor(() => {
            expect(frames).toContainEqual({ type: 'terminal.status', data: { status: 'error' } });
            expect(frames).toContainEqual({ type: 'terminal.exit', data: { code: 70 } });
        });
        lookup.mockRestore();
    });
});
