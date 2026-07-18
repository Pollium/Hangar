import { get, post } from '../../shared/routing';
import type { Notification } from './domain';

export const notificationRoutes = {
    list: get<Notification[]>('/notifications'),
    markRead: post<void, Notification>('/notifications/:id/read'),
    markAllRead: post<void>('/notifications/read-all')
};
