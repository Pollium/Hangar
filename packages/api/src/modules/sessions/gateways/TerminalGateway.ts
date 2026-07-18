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
import TerminalBridge from '../services/TerminalBridge';
import { SessionError } from '../contracts/domain/errors';
import type Session from '../models/Session';
import type {
    TerminalJoinPayload,
    TerminalInputPayload,
    TerminalResizePayload,
    TerminalFrame
} from '@cloud-code/contracts/modules/session/terminal';

interface RoomFanout{
    listener: (frame: TerminalFrame) => void;
    session: Session;
    refs: number;
}

/**
 * Streams a session's tmux PTY to the browser and back. Mirrors ChatGateway: one WS channel,
 * auth middleware, per-message handlers. A single bridge listener per session fans out to the
 * room so N open tabs cost one broadcast, not N.
 */
@Channel('/sessions/terminal')
@Middleware(SocketAuthenticatedRoute)
export default class TerminalGateway extends BaseGateway{
    #sessions = new SessionService();
    #bridge = new TerminalBridge();
    #joined = new WeakMap<GatewaySocket, number>();
    #fanouts = new Map<number, RoomFanout>();

    @OnMessage('terminal.join')
    async join(
        @CurrentUser() userId: number,
        @Payload() payload: TerminalJoinPayload,
        @Socket() socket: GatewaySocket
    ): Promise<void>{
        const sessionId = parseId(payload.sessionId);
        const session = await this.#sessions.get(userId, sessionId);
        const room = this.#room(sessionId);

        this.connections.join(socket, room);
        this.#joined.set(socket, sessionId);

        // Replay the current screen to just this socket.
        const snapshot = await this.#bridge.snapshot(session);
        this.#sendTo(socket, { type: 'terminal.output', data: { chunk: snapshot } });

        await this.#ensureFanout(session);
    }

    @OnMessage('terminal.input')
    input(@Socket() socket: GatewaySocket, @Payload() payload: TerminalInputPayload): void{
        const sessionId = this.#joined.get(socket);
        if(sessionId === undefined) throw SessionError.NotJoined();
        this.#bridge.write(sessionId, payload.data);
    }

    @OnMessage('terminal.resize')
    resize(@Socket() socket: GatewaySocket, @Payload() payload: TerminalResizePayload): void{
        const sessionId = this.#joined.get(socket);
        if(sessionId !== undefined) this.#bridge.resize(sessionId, payload.cols, payload.rows);
    }

    @OnDisconnect()
    disconnect(@Socket() socket: GatewaySocket): void{
        const sessionId = this.#joined.get(socket);
        this.#joined.delete(socket);
        if(sessionId !== undefined) this.#releaseFanout(sessionId);
        // The tmux session keeps running — detaching a viewer never stops the agent.
    }

    async #ensureFanout(session: Session): Promise<void>{
        const existing = this.#fanouts.get(session.id);
        if(existing){
            existing.refs += 1;
            return;
        }

        const room = this.#room(session.id);
        const listener = (frame: TerminalFrame): void => this.connections.sendToRoom(room, frame);
        this.#fanouts.set(session.id, { listener, session, refs: 1 });
        await this.#bridge.subscribe(session, listener);
    }

    #releaseFanout(sessionId: number): void{
        const fanout = this.#fanouts.get(sessionId);
        if(!fanout) return;
        fanout.refs -= 1;
        if(fanout.refs <= 0){
            this.#bridge.unsubscribe(sessionId, fanout.listener);
            this.#fanouts.delete(sessionId);
        }
    }

    #sendTo(socket: GatewaySocket, frame: TerminalFrame): void{
        socket.send(JSON.stringify(frame));
    }

    #room(sessionId: number): string{
        return `session:${sessionId}:terminal`;
    }
}
