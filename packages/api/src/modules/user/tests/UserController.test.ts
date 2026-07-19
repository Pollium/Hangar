import { describe, expect, it } from 'vitest';
import { userRoutes } from '@hangar/contracts/modules/user/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from './UserSeed';
import User from '../models/User';

describe('UserController', () => {
    const ctx = useApp();

    it('returns the current user profile', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.me, { as: user.id });

        expect(res.status).toBe(200);
        expect(res.data().email).toBe(user.email);
    });

    it('rejects an unauthenticated request', async () => {
        const res = await request(ctx.app, userRoutes.me);

        expect(res.status).toBe(401);
    });

    it('updates the profile', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.updateProfile, {
            as: user.id,
            body: { bio: 'building cloud-code' }
        });

        expect(res.status).toBe(200);
        expect(res.data().bio).toBe('building cloud-code');
    });

    it('changes the password with the correct current password', async () => {
        const user = await userSeed.passwordUser('password-123');

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: { currentPassword: 'password-123', newPassword: 'password-456' }
        });

        expect(res.status).toBe(204);
    });

    it('rejects a password change with a wrong current password', async () => {
        const user = await userSeed.passwordUser('password-123');

        const res = await request(ctx.app, userRoutes.changePassword, {
            as: user.id,
            body: { currentPassword: 'wrong', newPassword: 'password-456' }
        });

        expectError(res, 401, 'User::InvalidPassword');
    });

    it('deletes the account', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, userRoutes.deleteMe, { as: user.id });

        expect(res.status).toBe(204);
        expect(await User.findOneBy({ id: user.id })).toBeNull();
    });
});
