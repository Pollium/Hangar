import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnConnect } from '@/shared/gateways/Gateway';
import { Socket } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { eventBus } from '@/shared/events/EventBus';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { SessionStatusChangedPayload } from '@/modules/sessions/contracts/domain/events';
import FleetService from '../services/FleetService';

/** Live overview of every session a user owns — one channel feeds the whole dashboard. */
@Channel('/fleet')
@Middleware(SocketAuthenticatedRoute)
export default class FleetGateway extends BaseGateway{
    #fleet = new FleetService();

    constructor(){
        super();
        eventBus.subscribe('session.status_changed', (payload) => this.#onStatus(payload as SessionStatusChangedPayload));
    }

    @OnConnect()
    async connect(@CurrentUser() userId: number, @Socket() socket: GatewaySocket): Promise<void>{
        this.connections.join(socket, this.#room(userId));
        const sessions = await this.#fleet.snapshot(userId);
        socket.send(JSON.stringify({ type: 'fleet.snapshot', data: { sessions } }));
    }

    #onStatus(payload: SessionStatusChangedPayload): void{
        this.connections.sendToRoom(this.#room(payload.ownerId), {
            type: 'fleet.session',
            data: { sessionId: payload.sessionId, status: payload.status }
        });
    }

    #room(userId: number): string{
        return `fleet:${userId}`;
    }
}
