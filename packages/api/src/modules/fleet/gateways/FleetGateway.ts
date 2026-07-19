import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnConnect } from '@/shared/gateways/Gateway';
import { Socket } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { eventBus } from '@/shared/events/EventBus';
import RuntimeError from '@/shared/errors/RuntimeError';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { SessionRemovedPayload, SessionStatusChangedPayload } from '@/modules/sessions/contracts/domain/events';
import type { FleetFrame } from '@cloud-code/contracts/modules/fleet/channel';
import FleetService from '../services/FleetService';

/** Live overview of every session a user owns — one ordered channel feeds the dashboard. */
@Channel('/fleet')
@Middleware(SocketAuthenticatedRoute)
export default class FleetGateway extends BaseGateway{
    #fleet: FleetService;
    #tails = new Map<number, Promise<void>>();
    #revisions = new Map<number, number>();

    constructor(fleet: FleetService = new FleetService()){
        super();
        this.#fleet = fleet;
        eventBus.subscribe('session.status_changed', (payload) => this.#onStatus(payload as SessionStatusChangedPayload));
        eventBus.subscribe('session.removed', (payload) => this.#onRemoved(payload as SessionRemovedPayload));
    }

    @OnConnect()
    connect(@CurrentUser() userId: number, @Socket() socket: GatewaySocket): Promise<void>{
        return this.#enqueue(userId, async () => {
            const sessions = await this.#fleet.snapshot(userId);
            const room = this.#room(userId);
            this.connections.join(socket, room);
            try{
                const frame = {
                    type: 'fleet.snapshot',
                    data: { sessions, revision: this.#nextRevision(userId) }
                } satisfies FleetFrame;
                socket.send(JSON.stringify(frame));
            }catch(error){
                this.connections.leave(socket, room);
                throw error;
            }
        });
    }

    #onStatus(payload: SessionStatusChangedPayload): Promise<void>{
        return this.#enqueue(payload.ownerId, async () => {
            try{
                const session = await this.#fleet.session(payload.ownerId, payload.sessionId);
                this.connections.sendToRoom(this.#room(payload.ownerId), {
                    type: 'fleet.session',
                    data: { session, revision: this.#nextRevision(payload.ownerId) }
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
        return this.#enqueue(payload.ownerId, async () => {
            this.connections.sendToRoom(this.#room(payload.ownerId), {
                type: 'fleet.remove',
                data: { sessionId: payload.sessionId, revision: this.#nextRevision(payload.ownerId) }
            } satisfies FleetFrame);
        });
    }

    #enqueue(ownerId: number, operation: () => Promise<void>): Promise<void>{
        const previous = this.#tails.get(ownerId) ?? Promise.resolve();
        const task = previous.catch(() => undefined).then(operation);
        this.#tails.set(ownerId, task);
        return task.finally(() => {
            if(this.#tails.get(ownerId) === task) this.#tails.delete(ownerId);
        });
    }

    #nextRevision(ownerId: number): number{
        const revision = (this.#revisions.get(ownerId) ?? 0) + 1;
        this.#revisions.set(ownerId, revision);
        return revision;
    }

    #room(userId: number): string{
        return `fleet:${userId}`;
    }
}
