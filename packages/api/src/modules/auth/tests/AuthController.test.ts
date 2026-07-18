import { describe, expect, it } from 'vitest';
import { authRoutes } from '@cloud-code/contracts/modules/auth/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from '@/modules/user/tests/UserSeed';
import type { SignUpInput } from '@cloud-code/contracts/modules/auth/http';

const signUp = (overrides: Partial<SignUpInput> = {}): SignUpInput => ({
    fullName: 'Ada Lovelace',
    email: 'ada@cloud-code.test',
    username: 'ada',
    password: 'password-123',
    ...overrides
});

describe('AuthController', () => {
    const ctx = useApp();

    it('signs up a new user and returns a token', async () => {
        const res = await request(ctx.app, authRoutes.signUp, { body: signUp() });

        expect(res.status).toBe(201);
        const session = res.data();
        expect(session.token).toBeTruthy();
        expect(session.user.email).toBe('ada@cloud-code.test');
    });

    it('rejects duplicate email on sign up', async () => {
        await request(ctx.app, authRoutes.signUp, { body: signUp() });
        const res = await request(ctx.app, authRoutes.signUp, { body: signUp({ username: 'ada2' }) });

        expectError(res, 409, 'Auth::EmailAlreadyRegistered');
    });

    it('signs in with valid credentials', async () => {
        const user = await userSeed.passwordUser('password-123');

        const res = await request(ctx.app, authRoutes.signIn, {
            body: { email: user.email, password: 'password-123' }
        });

        expect(res.status).toBe(200);
        expect(res.data().token).toBeTruthy();
    });

    it('rejects sign in with wrong password', async () => {
        const user = await userSeed.passwordUser('password-123');

        const res = await request(ctx.app, authRoutes.signIn, {
            body: { email: user.email, password: 'wrong-password' }
        });

        expectError(res, 401, 'Auth::InvalidCredentials');
    });

    it('reports email availability', async () => {
        const user = await userSeed.user();

        const taken = await request(ctx.app, authRoutes.checkEmail, { query: { email: user.email } });
        expect(taken.data().exists).toBe(true);

        const free = await request(ctx.app, authRoutes.checkEmail, { query: { email: 'ghost@cloud-code.test' } });
        expect(free.data().exists).toBe(false);
    });
});
