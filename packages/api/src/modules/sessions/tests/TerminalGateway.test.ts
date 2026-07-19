import { describe, expect, it, vi } from 'vitest';
import TerminalGateway from '../gateways/TerminalGateway';
import type SessionService from '../services/SessionService';
import type TerminalBridge from '../services/TerminalBridge';
import type Session from '../models/Session';
import type { GatewaySocket } from '@/shared/contracts/gateway';

const session = {
    id: 42,
    ownerId: 7,
    projectId: 3,
    status: 'running'
} as Session;

const harness = (subscribe: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined)) => {
    const sessions = { get: vi.fn().mockResolvedValue(session) } as unknown as SessionService;
    let releaseListener: ((sessionId: number, reason: 'stopped' | 'removed' | 'exit') => void) | undefined;
    const bridge = {
        snapshot: vi.fn().mockResolvedValue('screen'),
        subscribe,
        unsubscribe: vi.fn(),
        onRelease: vi.fn().mockImplementation((listener: typeof releaseListener) => {
            releaseListener = listener;
            return () => { releaseListener = undefined; };
        }),
        write: vi.fn().mockReturnValue(true),
        resize: vi.fn()
    } as unknown as TerminalBridge;
    const send = vi.fn();
    const socket = { send } as unknown as GatewaySocket;
    return {
        gateway: new TerminalGateway(sessions, bridge),
        sessions,
        bridge,
        send,
        socket,
        release: (
            sessionId: number,
            reason: 'stopped' | 'removed' | 'exit' = 'exit'
        ) => releaseListener?.(sessionId, reason)
    };
};

describe('TerminalGateway', () => {
    it('applies initial dimensions and acknowledges ready only after the PTY attach', async () => {
        const { gateway, bridge, send, socket } = harness();
        vi.mocked(bridge.snapshot).mockResolvedValueOnce('first line\nsecond line');

        await gateway.join(7, { sessionId: 42, cols: 196, rows: 61 }, socket);

        expect(bridge.snapshot).toHaveBeenCalledWith(session, { cols: 196, rows: 61 });
        expect(bridge.resize).toHaveBeenCalledWith(42, 196, 61);
        const frames = send.mock.calls.map(([raw]) => JSON.parse(raw as string));
        expect(frames).toContainEqual({
            type: 'terminal.output',
            data: { chunk: 'first line\r\nsecond line' }
        });
        expect(frames).toContainEqual({
            type: 'terminal.ready',
            data: { sessionId: 42, cols: 196, rows: 61 }
        });

        gateway.resize(socket, { cols: 9999, rows: 1 });
        expect(bridge.resize).toHaveBeenLastCalledWith(42, 500, 5);
        gateway.disconnect(socket);
    });

    it('keeps a repeated join from taking a second fanout reference', async () => {
        const { gateway, bridge, socket } = harness();

        await gateway.join(7, { sessionId: 42 }, socket);
        await gateway.join(7, { sessionId: 42 }, socket);
        gateway.disconnect(socket);

        expect(bridge.subscribe).toHaveBeenCalledTimes(1);
        expect(bridge.snapshot).toHaveBeenCalledTimes(2);
        expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('re-subscribes when the bridge releases the PTY without terminal.exit', async () => {
        const { gateway, bridge, socket, release } = harness();

        await gateway.join(7, { sessionId: 42 }, socket);
        release(42);
        await gateway.join(7, { sessionId: 42 }, socket);
        gateway.disconnect(socket);

        expect(bridge.subscribe).toHaveBeenCalledTimes(2);
        expect(bridge.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('keeps the shared fanout while another room member remains', async () => {
        const subscribe = vi.fn().mockResolvedValue(undefined);
        const { gateway, bridge, socket: socketA } = harness(subscribe);
        const sendB = vi.fn();
        const socketB = { send: sendB } as unknown as GatewaySocket;

        await gateway.join(7, { sessionId: 42 }, socketA);
        await gateway.join(7, { sessionId: 42 }, socketB);
        expect(subscribe).toHaveBeenCalledTimes(1);

        gateway.disconnect(socketA);
        expect(bridge.unsubscribe).not.toHaveBeenCalled();

        sendB.mockClear();
        const listener = subscribe.mock.calls[0][1] as (frame: { type: string; data: unknown }) => void;
        listener({ type: 'terminal.output', data: { chunk: 'still live' } });
        expect(sendB).toHaveBeenCalledTimes(1);

        gateway.disconnect(socketB);
        expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('invalidates a repeated join when the PTY releases during its snapshot', async () => {
        const { gateway, bridge, socket, release } = harness();
        await gateway.join(7, { sessionId: 42 }, socket);

        let resolveSnapshot!: (value: string) => void;
        const pendingSnapshot = new Promise<string>((resolve) => { resolveSnapshot = resolve; });
        vi.mocked(bridge.snapshot).mockReturnValueOnce(pendingSnapshot);
        const retrying = gateway.join(7, { sessionId: 42 }, socket);
        await vi.waitFor(() => expect(bridge.snapshot).toHaveBeenCalledTimes(2));
        release(42);
        resolveSnapshot('stale screen');
        await retrying;

        expect(() => gateway.input(socket, { data: 'x' })).toThrow('Session::NotJoined');
        await gateway.join(7, { sessionId: 42 }, socket);
        expect(bridge.subscribe).toHaveBeenCalledTimes(2);
        gateway.disconnect(socket);
    });

    it('rejects a fanout flight invalidated by release and attaches on the next join', async () => {
        let resolveFirst!: () => void;
        const first = new Promise<void>((resolve) => { resolveFirst = resolve; });
        const subscribe = vi.fn()
            .mockReturnValueOnce(first)
            .mockResolvedValueOnce(undefined);
        const { gateway, bridge, socket, release } = harness(subscribe);

        const invalidated = gateway.join(7, { sessionId: 42 }, socket);
        await vi.waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
        release(42);
        resolveFirst();
        await invalidated;
        expect(() => gateway.input(socket, { data: 'x' })).toThrow('Session::NotJoined');

        await gateway.join(7, { sessionId: 42 }, socket);
        expect(subscribe).toHaveBeenCalledTimes(2);
        expect(bridge.unsubscribe).toHaveBeenCalled();
        gateway.disconnect(socket);
    });

    it('leaves the room before get and coalesces concurrent repeated joins', async () => {
        const { gateway, sessions, bridge, send, socket } = harness();
        await gateway.join(7, { sessionId: 42, cols: 180, rows: 52 }, socket);
        send.mockClear();

        let resolveGet!: (value: Session) => void;
        vi.mocked(sessions.get).mockReturnValueOnce(new Promise<Session>((resolve) => {
            resolveGet = resolve;
        }));
        const first = gateway.join(7, { sessionId: 42, cols: 181, rows: 53 }, socket);
        const coalesced = gateway.join(7, { sessionId: 42, cols: 220, rows: 70 }, socket);

        const listener = vi.mocked(bridge.subscribe).mock.calls[0][1] as (
            frame: { type: 'terminal.output'; data: { chunk: string } }
        ) => void;
        listener({ type: 'terminal.output', data: { chunk: 'before get resolves' } });
        expect(send).not.toHaveBeenCalled();

        resolveGet(session);
        await Promise.all([first, coalesced]);
        expect(bridge.snapshot).toHaveBeenCalledTimes(2);
        expect(bridge.snapshot).toHaveBeenLastCalledWith(session, { cols: 220, rows: 70 });
        gateway.disconnect(socket);
    });

    it('invalidates all viewers on stop and requires explicit restart', async () => {
        const { gateway, sessions, bridge, send, socket: socketA, release } = harness();
        const sendB = vi.fn();
        const socketB = { send: sendB } as unknown as GatewaySocket;
        await gateway.join(7, { sessionId: 42 }, socketA);
        await gateway.join(7, { sessionId: 42 }, socketB);
        send.mockClear();
        sendB.mockClear();

        release(42, 'stopped');
        const closed = {
            type: 'terminal.closed',
            data: { sessionId: 42, reason: 'stopped' }
        };
        expect(JSON.parse(send.mock.calls[0][0] as string)).toEqual(closed);
        expect(JSON.parse(sendB.mock.calls[0][0] as string)).toEqual(closed);
        expect(() => gateway.input(socketA, { data: 'x' })).toThrow('Session::NotJoined');
        expect(() => gateway.input(socketB, { data: 'x' })).toThrow('Session::NotJoined');
        expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);

        const stopped = { ...session, status: 'stopped' } as Session;
        vi.mocked(sessions.get).mockResolvedValue(stopped);
        await expect(gateway.join(7, { sessionId: 42 }, socketA)).rejects.toMatchObject({
            message: 'Session::NotRunning'
        });
        await gateway.join(7, { sessionId: 42, restart: true }, socketA);
        gateway.disconnect(socketA);
    });

    it('cancels a refresh when capture-time replay overflows repeatedly', async () => {
        const { gateway, bridge, send, socket } = harness();
        await gateway.join(7, { sessionId: 42 }, socket);
        send.mockClear();

        const resolvers: Array<(value: string) => void> = [];
        vi.mocked(bridge.snapshot).mockImplementation(() => new Promise<string>((resolve) => {
            resolvers.push(resolve);
        }));
        const listener = vi.mocked(bridge.subscribe).mock.calls[0][1] as (
            frame: { type: 'terminal.output'; data: { chunk: string } }
        ) => void;
        const refreshing = gateway.join(7, { sessionId: 42 }, socket);

        for(let attempt = 0; attempt < 3; attempt += 1){
            await vi.waitFor(() => expect(resolvers).toHaveLength(attempt + 1));
            listener({ type: 'terminal.output', data: { chunk: 'a'.repeat(3 * 1024 * 1024) } });
            listener({ type: 'terminal.output', data: { chunk: 'b'.repeat(3 * 1024 * 1024) } });
            resolvers[attempt](`screen ${attempt}`);
        }

        await expect(refreshing).rejects.toMatchObject({ message: 'Session::NotJoined' });
        expect(send).not.toHaveBeenCalled();
        expect(() => gateway.input(socket, { data: 'x' })).toThrow('Session::NotJoined');
    });

    it('keeps the widest active viewer and recomputes after it disconnects', async () => {
        const { gateway, bridge, socket: desktop } = harness();
        const mobile = { send: vi.fn() } as unknown as GatewaySocket;

        await gateway.join(7, { sessionId: 42, cols: 220, rows: 70 }, desktop);
        vi.mocked(bridge.resize).mockClear();

        await gateway.join(7, { sessionId: 42, cols: 80, rows: 24 }, mobile);
        expect(bridge.snapshot).toHaveBeenLastCalledWith(session, { cols: 220, rows: 70 });
        expect(bridge.resize).toHaveBeenLastCalledWith(42, 220, 70);

        gateway.resize(mobile, { cols: 60, rows: 20 });
        expect(bridge.resize).toHaveBeenLastCalledWith(42, 220, 70);

        gateway.disconnect(desktop);
        expect(bridge.resize).toHaveBeenLastCalledWith(42, 60, 20);
        gateway.disconnect(mobile);
    });

    it('buffers live output during a repeated snapshot and replays it in order', async () => {
        const { gateway, bridge, send, socket } = harness();
        await gateway.join(7, { sessionId: 42, cols: 180, rows: 52 }, socket);
        send.mockClear();

        let resolveSnapshot!: (value: string) => void;
        const pendingSnapshot = new Promise<string>((resolve) => { resolveSnapshot = resolve; });
        vi.mocked(bridge.snapshot).mockReturnValueOnce(pendingSnapshot);

        const refreshing = gateway.join(7, { sessionId: 42, cols: 181, rows: 53 }, socket);
        await vi.waitFor(() => expect(bridge.snapshot).toHaveBeenCalledTimes(2));
        const listener = vi.mocked(bridge.subscribe).mock.calls[0][1] as (
            frame: { type: 'terminal.output'; data: { chunk: string } }
        ) => void;
        listener({ type: 'terminal.output', data: { chunk: 'live during capture' } });
        expect(send).not.toHaveBeenCalled();

        resolveSnapshot('refreshed screen');
        await refreshing;

        expect(send.mock.calls.map(([raw]) => JSON.parse(raw as string))).toEqual([
            { type: 'terminal.output', data: { chunk: 'refreshed screen' } },
            { type: 'terminal.output', data: { chunk: 'live during capture' } },
            { type: 'terminal.ready', data: { sessionId: 42, cols: 181, rows: 53 } }
        ]);
        gateway.disconnect(socket);
    });

    it('releases the acquisition when the socket disconnects during subscribe', async () => {
        let resolveSubscribe!: () => void;
        const pending = new Promise<void>((resolve) => { resolveSubscribe = resolve; });
        const subscribe = vi.fn().mockReturnValue(pending);
        const { gateway, bridge, socket } = harness(subscribe);

        const joining = gateway.join(7, { sessionId: 42 }, socket);
        await vi.waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
        gateway.disconnect(socket);
        resolveSubscribe();
        await joining;

        expect(bridge.unsubscribe).toHaveBeenCalledTimes(1);
    });
});
