import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnMessage, OnDisconnect } from '@/shared/gateways/Gateway';
import { Payload, Socket } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import { parseId } from '@/shared/controllers/parseId';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import SessionService from '../services/SessionService';
import TerminalBridge, {
    terminalBridge,
    type TerminalReleaseReason
} from '../services/TerminalBridge';
import { SessionError } from '../contracts/domain/errors';
import type Session from '../models/Session';
import type {
    TerminalJoinPayload,
    TerminalInputPayload,
    TerminalResizePayload,
    TerminalDimensions,
    TerminalFrame
} from '@hangar/contracts/modules/session/terminal';

const FANOUT_REPLAY_BYTES = 4 * 1024 * 1024;
const SNAPSHOT_ATTEMPTS = 3;

interface SequencedFrame{
    sequence: number;
    frame: TerminalFrame;
    bytes: number;
}

interface RoomFanout{
    listener: (frame: TerminalFrame) => void;
    sequence: number;
    replay: SequencedFrame[];
    replayBytes: number;
}

interface SocketJoin{
    sessionId: number;
    token: symbol;
    active: boolean;
    member: boolean;
    dimensions?: TerminalDimensions;
}

interface PreparedSnapshot{
    snapshot: string;
    fanout: RoomFanout;
    cursor: number;
}

/**
 * Streams one shared tmux PTY to every viewer. Joins temporarily stay outside the room while
 * a snapshot is captured, then replay live frames observed during capture before joining the
 * room synchronously. The shared PTY uses the maximum dimensions requested by active viewers,
 * so a narrow/mobile tab cannot shrink a wider desktop terminal.
 */
@Channel('/sessions/terminal')
@Middleware(SocketAuthenticatedRoute)
export default class TerminalGateway extends BaseGateway{
    #sessions: SessionService;
    #bridge: TerminalBridge;
    #joins = new Map<GatewaySocket, SocketJoin>();
    #members = new Map<number, Set<GatewaySocket>>();
    #fanouts = new Map<number, RoomFanout>();
    #fanoutFlights = new Map<number, Promise<void>>();
    #fanoutGenerations = new Map<number, number>();

    constructor(sessions: SessionService = new SessionService(), bridge: TerminalBridge = terminalBridge){
        super();
        this.#sessions = sessions;
        this.#bridge = bridge;
        this.#bridge.onRelease((sessionId, reason) => {
            this.#fanoutGenerations.set(sessionId, (this.#fanoutGenerations.get(sessionId) ?? 0) + 1);
            this.#dropFanout(sessionId);
            this.#invalidateSession(sessionId, reason);
        });
    }

    @OnMessage('terminal.join')
    async join(
        @CurrentUser() userId: number,
        @Payload() payload: TerminalJoinPayload,
        @Socket() socket: GatewaySocket
    ): Promise<void>{
        const sessionId = parseId(payload.sessionId);
        const previous = this.#joins.get(socket);
        const dimensions = this.#dimensions(payload) ?? (
            previous?.sessionId === sessionId ? previous.dimensions : undefined
        );

        if(previous?.sessionId === sessionId){
            previous.dimensions = dimensions;
            if(!previous.active) return;
            await this.#refreshJoin(userId, socket, previous);
            return;
        }

        if(previous) this.#cancelJoin(socket, previous);
        const token = Symbol(`terminal:${sessionId}`);
        const pending: SocketJoin = {
            sessionId,
            token,
            active: false,
            member: false,
            dimensions
        };
        this.#joins.set(socket, pending);

        try{
            const session = await this.#sessions.get(userId, sessionId);
            if(!this.#isCurrent(socket, token)) return;
            if(session.status === 'stopped' && payload.restart !== true){
                throw SessionError.NotRunning();
            }

            // Logical membership is registered before attach so concurrent viewers contribute
            // to the max-size policy, but this socket stays outside the broadcast room until
            // its snapshot and buffered live frames have been sent in order.
            this.#addMember(sessionId, socket);
            pending.member = true;
            const effective = this.#effectiveDimensions(sessionId);
            const prepared = await this.#prepareSnapshot(session, effective, socket, token);
            if(!prepared) return;

            this.#sendSnapshot(socket, prepared.snapshot);
            this.#replay(socket, prepared.fanout, prepared.cursor);
            this.connections.join(socket, this.#room(sessionId));
            pending.active = true;
            this.#applyEffectiveSize(sessionId);
            this.#sendReady(socket, sessionId, effective);
        }catch(error){
            const current = this.#isCurrent(socket, token);
            if(pending.member){
                pending.member = false;
                this.#removeMember(sessionId, socket);
            }
            this.connections.leave(socket, this.#room(sessionId));
            if(!current) return;
            this.#joins.delete(socket);
            throw error;
        }
    }

    @OnMessage('terminal.input')
    input(@Socket() socket: GatewaySocket, @Payload() payload: TerminalInputPayload): void{
        const joined = this.#joins.get(socket);
        if(!joined?.active || !this.#bridge.write(joined.sessionId, payload.data)){
            throw SessionError.NotJoined();
        }
    }

    @OnMessage('terminal.resize')
    resize(@Socket() socket: GatewaySocket, @Payload() payload: TerminalResizePayload): void{
        const joined = this.#joins.get(socket);
        const dimensions = this.#dimensions(payload);
        if(!joined?.active || !dimensions) return;

        joined.dimensions = dimensions;
        this.#applyEffectiveSize(joined.sessionId);
    }

    @OnDisconnect()
    disconnect(@Socket() socket: GatewaySocket): void{
        const joined = this.#joins.get(socket);
        if(joined) this.#cancelJoin(socket, joined);
        // The tmux session keeps running — detaching a viewer never stops the agent.
    }

    async #refreshJoin(
        userId: number,
        socket: GatewaySocket,
        joined: SocketJoin
    ): Promise<void>{
        // This executes synchronously before sessions.get(): no live frame can overtake the
        // refreshed snapshot, and another join observes active=false and coalesces into this one.
        const room = this.#room(joined.sessionId);
        joined.active = false;
        this.connections.leave(socket, room);

        try{
            const session = await this.#sessions.get(userId, joined.sessionId);
            if(!this.#isCurrent(socket, joined.token)) return;
            const effective = this.#effectiveDimensions(joined.sessionId);
            const prepared = await this.#prepareSnapshot(session, effective, socket, joined.token);
            if(!prepared) return;

            this.#sendSnapshot(socket, prepared.snapshot);
            this.#replay(socket, prepared.fanout, prepared.cursor);
            this.connections.join(socket, room);
            joined.active = true;
            this.#applyEffectiveSize(joined.sessionId);
            this.#sendReady(socket, joined.sessionId, effective);
        }catch(error){
            if(!this.#isCurrent(socket, joined.token)) return;
            this.#cancelJoin(socket, joined);
            throw error;
        }
    }

    async #prepareSnapshot(
        session: Session,
        dimensions: TerminalDimensions | undefined,
        socket: GatewaySocket,
        token: symbol
    ): Promise<PreparedSnapshot | undefined>{
        for(let attempt = 0; attempt < SNAPSHOT_ATTEMPTS; attempt += 1){
            await this.#ensureFanout(session, dimensions);
            if(!this.#isCurrent(socket, token)){
                this.#dropOrphanFanout(session.id);
                return undefined;
            }

            const fanout = this.#fanouts.get(session.id);
            if(!fanout) continue;
            const cursor = fanout.sequence;
            const snapshot = await this.#bridge.snapshot(session, dimensions);
            if(!this.#isCurrent(socket, token)) return undefined;

            // A release swaps the fanout generation. A replay overflow means the complete
            // capture-time delta is unavailable. In either case recapture against the current
            // attachment instead of exposing a gap or stale ordering to xterm.
            if(this.#fanouts.get(session.id) !== fanout || !this.#canReplay(fanout, cursor)) continue;
            return { snapshot, fanout, cursor };
        }

        throw SessionError.NotJoined();
    }

    async #ensureFanout(session: Session, dimensions?: TerminalDimensions): Promise<void>{
        if(this.#fanouts.has(session.id)) return;

        let active = this.#fanoutFlights.get(session.id);
        if(!active){
            const room = this.#room(session.id);
            const fanout: RoomFanout = {
                sequence: 0,
                replay: [],
                replayBytes: 0,
                listener: (frame) => {
                    this.#record(fanout, frame);
                    this.connections.sendToRoom(room, frame);
                    if(frame.type === 'terminal.exit') this.#dropFanout(session.id, fanout.listener);
                }
            };
            const generation = this.#fanoutGenerations.get(session.id) ?? 0;
            const task = (async () => {
                await this.#bridge.subscribe(session, fanout.listener, dimensions);
                if((this.#fanoutGenerations.get(session.id) ?? 0) !== generation){
                    this.#bridge.unsubscribe(session.id, fanout.listener);
                    throw SessionError.NotJoined();
                }
                this.#fanouts.set(session.id, fanout);
            })();
            this.#fanoutFlights.set(session.id, task);
            active = task;
        }

        try{
            await active;
        }finally{
            if(this.#fanoutFlights.get(session.id) === active) this.#fanoutFlights.delete(session.id);
        }
        if(!this.#fanouts.has(session.id)) throw SessionError.NotJoined();
    }

    #record(fanout: RoomFanout, frame: TerminalFrame): void{
        const bytes = Buffer.byteLength(JSON.stringify(frame));
        fanout.sequence += 1;
        fanout.replay.push({ sequence: fanout.sequence, frame, bytes });
        fanout.replayBytes += bytes;

        while(fanout.replay.length > 1 && fanout.replayBytes > FANOUT_REPLAY_BYTES){
            const removed = fanout.replay.shift();
            if(removed) fanout.replayBytes -= removed.bytes;
        }
    }

    #canReplay(fanout: RoomFanout, cursor: number): boolean{
        const first = fanout.replay[0];
        return !first || first.sequence <= cursor + 1;
    }

    #replay(socket: GatewaySocket, fanout: RoomFanout, cursor: number): void{
        for(const item of fanout.replay){
            if(item.sequence > cursor) this.#sendTo(socket, item.frame);
        }
    }

    #cancelJoin(socket: GatewaySocket, joined: SocketJoin): void{
        if(this.#joins.get(socket)?.token !== joined.token) return;
        this.#joins.delete(socket);
        this.connections.leave(socket, this.#room(joined.sessionId));
        if(joined.member){
            joined.member = false;
            this.#removeMember(joined.sessionId, socket);
        }
    }

    #invalidateSession(sessionId: number, reason: TerminalReleaseReason): void{
        const affected = [...this.#joins.entries()].filter(([, joined]) => (
            joined.sessionId === sessionId
        ));
        for(const [socket, joined] of affected){
            if(reason === 'stopped' || reason === 'removed' || reason === 'restarted'){
                this.#sendTo(socket, {
                    type: 'terminal.closed',
                    data: { sessionId, reason }
                });
            }else if(!joined.active){
                // Active room members already received the real terminal.exit from the fanout;
                // a socket paused for snapshot still needs a terminal signal to unblock its UI.
                this.#sendTo(socket, {
                    type: 'terminal.exit',
                    data: { code: null }
                });
            }
            this.#joins.delete(socket);
            this.connections.leave(socket, this.#room(sessionId));
            joined.member = false;
            joined.active = false;
        }
        this.#members.delete(sessionId);
    }

    #addMember(sessionId: number, socket: GatewaySocket): void{
        const members = this.#members.get(sessionId) ?? new Set<GatewaySocket>();
        members.add(socket);
        this.#members.set(sessionId, members);
    }

    #removeMember(sessionId: number, socket: GatewaySocket): void{
        const members = this.#members.get(sessionId);
        if(!members){
            this.#dropFanout(sessionId);
            return;
        }

        members.delete(socket);
        if(members.size === 0){
            this.#members.delete(sessionId);
            this.#dropFanout(sessionId);
            return;
        }
        this.#applyEffectiveSize(sessionId);
    }

    #effectiveDimensions(sessionId: number): TerminalDimensions | undefined{
        let cols = 0;
        let rows = 0;
        const members = this.#members.get(sessionId);
        for(const member of members ?? []){
            const dimensions = this.#joins.get(member)?.dimensions;
            if(!dimensions) continue;
            cols = Math.max(cols, dimensions.cols);
            rows = Math.max(rows, dimensions.rows);
        }
        return cols > 0 && rows > 0 ? { cols, rows } : undefined;
    }

    #applyEffectiveSize(sessionId: number): void{
        const dimensions = this.#effectiveDimensions(sessionId);
        if(dimensions) this.#bridge.resize(sessionId, dimensions.cols, dimensions.rows);
    }

    #dropOrphanFanout(sessionId: number): void{
        if((this.#members.get(sessionId)?.size ?? 0) === 0) this.#dropFanout(sessionId);
    }

    #dropFanout(sessionId: number, expected?: (frame: TerminalFrame) => void): void{
        const fanout = this.#fanouts.get(sessionId);
        if(!fanout || (expected && fanout.listener !== expected)) return;
        this.#bridge.unsubscribe(sessionId, fanout.listener);
        this.#fanouts.delete(sessionId);
    }

    #isCurrent(socket: GatewaySocket, token: symbol): boolean{
        return this.#joins.get(socket)?.token === token;
    }

    #dimensions(payload: Partial<TerminalDimensions>): TerminalDimensions | undefined{
        const cols = Number(payload.cols);
        const rows = Number(payload.rows);
        if(!Number.isFinite(cols) || !Number.isFinite(rows)) return undefined;
        return {
            cols: Math.min(500, Math.max(20, Math.floor(cols))),
            rows: Math.min(300, Math.max(5, Math.floor(rows)))
        };
    }

    #sendSnapshot(socket: GatewaySocket, snapshot: string): void{
        const chunk = snapshot.replace(/\r?\n/g, '\r\n');
        this.#sendTo(socket, { type: 'terminal.output', data: { chunk } });
    }

    #sendReady(socket: GatewaySocket, sessionId: number, dimensions?: TerminalDimensions): void{
        this.#sendTo(socket, {
            type: 'terminal.ready',
            data: { sessionId, ...(dimensions ?? {}) }
        });
    }

    #sendTo(socket: GatewaySocket, frame: TerminalFrame): void{
        socket.send(JSON.stringify(frame));
    }

    #room(sessionId: number): string{
        return `session:${sessionId}:terminal`;
    }
}
