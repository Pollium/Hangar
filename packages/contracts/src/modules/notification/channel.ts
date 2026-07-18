import type { Notification } from './domain';

export interface NotificationCreatedFrame{
    type: 'notification.created';
    data: Notification;
}
