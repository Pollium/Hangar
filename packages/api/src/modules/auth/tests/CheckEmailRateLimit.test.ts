import { describe, expect, it } from 'vitest';
import { authRoutes } from '@hangar/contracts/modules/auth/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';

describe('AuthController checkEmail hardening', () => {
    const ctx = useApp();

    it('rejects a missing or empty email with a per-field error map', async () => {
        const missing = await request(ctx.app, authRoutes.checkEmail);

        expectError(missing, 400, 'Request::ValidationFailed');
        expect(missing.json()).toMatchObject({ errors: { email: 'Required' } });

        const empty = await request(ctx.app, authRoutes.checkEmail, { query: { email: '' } });

        expectError(empty, 400, 'Request::ValidationFailed');
        expect(empty.json()).toMatchObject({ errors: { email: 'Required' } });
    });

    it('exposes rate limit headers on a normal response', async () => {
        const res = await ctx.app.inject({
            method: 'GET',
            url: `${authRoutes.checkEmail.path}?email=ghost@pollium.test`
        });

        expect(res.statusCode).toBe(200);
        expect(String(res.headers['x-ratelimit-limit'])).toBe('3');
        expect(String(res.headers['x-ratelimit-remaining'])).toBe('0');
    });

    it('throttles requests past the limit', async () => {
        const res = await request(ctx.app, authRoutes.checkEmail, { query: { email: 'ghost@pollium.test' } });

        expectError(res, 429, 'RateLimit::TooManyRequests');
    });
});
