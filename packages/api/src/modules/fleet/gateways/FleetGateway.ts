import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnMessage, OnDisconnect } from '@/shared/gateways/Gateway';
import { Payload, Socket } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { eventBus } from '@/shared/events/EventBus';
import RuntimeError from '@/shared/errors/RuntimeError';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { SessionRemovedPayload, SessionStatusChangedPayload } from '@/modules/sessions/contracts/domain/events';
import type { FleetFrame, FleetSelectPayload } from '@hangar/contracts/modules/fleet/channel';
import FleetService from '../services/FleetService';

interface SocketJoin{
    projectId: number;
}

/** Live overview of every session in the currently selected project — one ordered channel
 * feeds the dashboard, re-joined to a different project room whenever the client switches. */
@Channel('/fleet')
@Middleware(SocketAuthenticatedRoute)
export default class FleetGateway extends BaseGateway{
    #fleet: FleetService;
    #joins = new Map<GatewaySocket, SocketJoin>();
    #tails = new Map<number, Promise<void>>();
    #revisions = new Map<number, number>();

    constructor(fleet: FleetService = new FleetService()){
        super();
        this.#fleet = fleet;
        eventBus.subscribe('session.status_changed', (payload) => this.#onStatus(payload as SessionStatusChangedPayload));
        eventBus.subscribe('session.removed', (payload) => this.#onRemoved(payload as SessionRemovedPayload));
    }

    @OnMessage('fleet.select')
    select(
        @CurrentUser() userId: number,
        @Payload() payload: FleetSelectPayload,
        @Socket() socket: GatewaySocket
    ): Promise<void>{
        const projectId = Number(payload.projectId);
        return this.#enqueue(projectId, async () => {
            // Authorizes via ProjectService membership inside snapshot(); a non-member throws
            // before any room is joined or state mutated.
            const sessions = await this.#fleet.snapshot(userId, projectId);

            const previous = this.#joins.get(socket);
            if(previous) this.connections.leave(socket, this.#room(previous.projectId));
            this.#joins.set(socket, { projectId });
            this.connections.join(socket, this.#room(projectId));

            const frame = {
                type: 'fleet.snapshot',
                data: { sessions, revision: this.#nextRevision(projectId) }
            } satisfies FleetFrame;
            socket.send(JSON.stringify(frame));
        });
    }

    @OnDisconnect()
    disconnect(@Socket() socket: GatewaySocket): void{
        const joined = this.#joins.get(socket);
        if(joined) this.connections.leave(socket, this.#room(joined.projectId));
        this.#joins.delete(socket);
    }

    #onStatus(payload: SessionStatusChangedPayload): Promise<void>{
        return this.#enqueue(payload.projectId, async () => {
            try{
                const session = await this.#fleet.session(payload.ownerId, payload.sessionId);
                this.connections.sendToRoom(this.#room(payload.projectId), {
                    type: 'fleet.session',
                    data: { session, revision: this.#nextRevision(payload.projectId) }
                } satisfies FleetFrame);
            }catch(error){
                // Remove has its own ordered event. A lookup that loses to it must not create
                // a second delta; transient DB errors must not hide a still-existing card.
                if(error instanceof RuntimeError && error.message.startsWith('Session::NotFound')) return;
                throw error;
            }
        });
    }

    #onRemoved(payload: SessionRemovedPayload): Promise<void>{
        return this.#enqueue(payload.projectId, async () => {
            this.connections.sendToRoom(this.#room(payload.projectId), {
                type: 'fleet.remove',
                data: { sessionId: payload.sessionId, revision: this.#nextRevision(payload.projectId) }
            } satisfies FleetFrame);
        });
    }

    #enqueue(projectId: number, operation: () => Promise<void>): Promise<void>{
        const previous = this.#tails.get(projectId) ?? Promise.resolve();
        const task = previous.catch(() => undefined).then(operation);
        this.#tails.set(projectId, task);
        return task.finally(() => {
            if(this.#tails.get(projectId) === task) this.#tails.delete(projectId);
        });
    }

    #nextRevision(projectId: number): number{
        const revision = (this.#revisions.get(projectId) ?? 0) + 1;
        this.#revisions.set(projectId, revision);
        return revision;
    }

    #room(projectId: number): string{
        return `fleet:project:${projectId}`;
    }
}
