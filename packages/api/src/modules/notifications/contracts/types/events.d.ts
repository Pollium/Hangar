import type { NotificationCreatedPayload } from '../domain/events';

declare global{
    interface EventMap{
        'notification.created': NotificationCreatedPayload;
    }
}
