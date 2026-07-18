import { describe, expect, it } from 'vitest';
import { notificationRoutes } from '@cloud-code/contracts/modules/notification/routes';
import { useApp, flushEvents } from '@tests/harness';
import { request } from '@tests/request';
import { eventBus } from '@/shared/events/EventBus';
import { userSeed } from '@/modules/user/tests/UserSeed';
import NotificationService from '../services/NotificationService';

describe('Notifications', () => {
    const ctx = useApp();

    it('creates a notification from a session.needs_input event', async () => {
        const user = await userSeed.user();

        eventBus.emit('session.needs_input', { sessionId: 1, ownerId: user.id, title: 'Fix bug' });
        await flushEvents();

        const res = await request(ctx.app, notificationRoutes.list, { as: user.id });
        expect(res.data()).toHaveLength(1);
        expect(res.data()[0].type).toBe('needs_input');
        expect(res.data()[0].message).toContain('Fix bug');
    });

    it('marks a notification as read', async () => {
        const user = await userSeed.user();
        const notification = await new NotificationService().create(user.id, 'idle', 5, 'done');

        const res = await request(ctx.app, notificationRoutes.markRead, { as: user.id, params: { id: notification.id } });

        expect(res.status).toBe(200);
        expect(res.data().readAt).not.toBeNull();
    });

    it('scopes notifications to their owner', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        await new NotificationService().create(bob.id, 'idle', 1, 'bob only');

        const res = await request(ctx.app, notificationRoutes.list, { as: alice.id });
        expect(res.data()).toHaveLength(0);
    });
});
