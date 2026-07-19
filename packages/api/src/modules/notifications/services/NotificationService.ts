import { eventBus } from '@/shared/events/EventBus';
import Notification from '../models/Notification';
import type { NotificationType } from '@hangar/contracts/modules/notification/domain';

export default class NotificationService{
    async create(ownerId: number, type: NotificationType, sessionId: number, message: string): Promise<Notification>{
        const notification = await (Notification.create({
            ownerId,
            type,
            sessionId,
            message,
            readAt: null
        }).save() as Promise<Notification>);

        // In-app fan-out (WS). Web push, when configured, also hangs off this event.
        eventBus.emit('notification.created', { ownerId, notification });
        return notification;
    }

    list(ownerId: number): Promise<Notification[]>{
        return Notification.find({ where: { ownerId }, order: { id: 'DESC' }, take: 100 });
    }

    async markRead(ownerId: number, id: number): Promise<Notification | null>{
        const notification = await Notification.findOneBy({ id, ownerId });
        if(!notification) return null;
        notification.readAt = new Date();
        return notification.save() as Promise<Notification>;
    }

    async markAllRead(ownerId: number): Promise<void>{
        await Notification.createQueryBuilder()
            .update()
            .set({ readAt: new Date() })
            .where('ownerId = :ownerId AND readAt IS NULL', { ownerId })
            .execute();
    }
}
