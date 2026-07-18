import type Notification from '../../models/Notification';

export interface NotificationCreatedPayload{
    ownerId: number;
    notification: Notification;
}
