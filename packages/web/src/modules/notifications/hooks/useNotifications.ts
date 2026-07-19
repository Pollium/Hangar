import { useState, useEffect, useCallback } from 'react';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import { notificationApi } from '@/modules/notifications/api/api';
import type { Notification } from '@hangar/contracts/modules/notification/domain';

export const useNotifications = () => {
    const [items, setItems] = useState<Notification[]>([]);

    useEffect(() => {
        void notificationApi.list().then(setItems).catch(() => setItems([]));
    }, []);

    useChannel('/notifications/stream', {
        'notification.created': (data) => setItems((prev) => [data as Notification, ...prev])
    });

    const markAllRead = useCallback(async () => {
        await notificationApi.markAllRead();
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }, []);

    const unread = items.filter((n) => !n.readAt).length;

    return { items, unread, markAllRead };
};
