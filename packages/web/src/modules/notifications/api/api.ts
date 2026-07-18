import { call } from '@/shared/api/call';
import { notificationRoutes } from '@cloud-code/contracts/modules/notification/routes';

export const notificationApi = {
    list: () => call(notificationRoutes.list),
    markRead: (id: number) => call(notificationRoutes.markRead, { path: { id } }),
    markAllRead: () => call(notificationRoutes.markAllRead)
};
