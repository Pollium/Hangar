import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnConnect } from '@/shared/gateways/Gateway';
import { Socket } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { eventBus } from '@/shared/events/EventBus';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import type { NotificationCreatedPayload } from '../contracts/domain/events';

/** Pushes in-app notifications live to the owner's connected clients. */
@Channel('/notifications/stream')
@Middleware(SocketAuthenticatedRoute)
export default class NotificationsGateway extends BaseGateway{
    constructor(){
        super();
        eventBus.subscribe('notification.created', (payload) => this.#push(payload as NotificationCreatedPayload));
    }

    @OnConnect()
    connect(@CurrentUser() userId: number, @Socket() socket: GatewaySocket): void{
        this.connections.join(socket, this.#room(userId));
    }

    #push(payload: NotificationCreatedPayload): void{
        this.connections.sendToRoom(this.#room(payload.ownerId), {
            type: 'notification.created',
            data: payload.notification
        });
    }

    #room(userId: number): string{
        return `user:${userId}`;
    }
}
