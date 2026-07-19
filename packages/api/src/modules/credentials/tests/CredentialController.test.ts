import { describe, expect, it } from 'vitest';
import { credentialRoutes } from '@hangar/contracts/modules/credential/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from '@/modules/user/tests/UserSeed';
import CredentialService from '../services/CredentialService';

describe('CredentialController', () => {
    const ctx = useApp();

    it('creates an environment variable without ever revealing its value or legacy storage fields', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, credentialRoutes.create, {
            as: user.id,
            body: { name: 'ANTHROPIC_API_KEY', value: 'sk-secret-123' }
        });

        expect(res.status, res.body).toBe(201);
        expect(res.body).not.toContain('sk-secret-123');
        expect(res.body).not.toContain('ciphertext');
        expect(res.data()).toMatchObject({ name: 'ANTHROPIC_API_KEY' });
        expect(res.data()).not.toHaveProperty('provider');
        expect(res.data()).not.toHaveProperty('label');
        expect(res.data()).not.toHaveProperty('envVar');
    });

    it('lists existing variables as name-only metadata', async () => {
        const user = await userSeed.user();
        await new CredentialService().create(user.id, {
            name: 'OPENAI_API_KEY', value: 'sk-openai'
        });

        const res = await request(ctx.app, credentialRoutes.list, { as: user.id });

        expect(res.data()).toHaveLength(1);
        expect(res.data()[0]).toMatchObject({ name: 'OPENAI_API_KEY' });
        expect(res.body).not.toContain('sk-openai');
        expect(res.body).not.toContain('envVar');
    });

    it('forbids deleting another user variable', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        const credential = await new CredentialService().create(bob.id, {
            name: 'ANTHROPIC_API_KEY', value: 'sk-bob'
        });

        const res = await request(ctx.app, credentialRoutes.remove, { as: alice.id, params: { id: credential.id } });

        expectError(res, 403, 'Credential::Forbidden');
    });

    it('resolves exact decrypted environment entries for the owner', async () => {
        const user = await userSeed.user();
        const service = new CredentialService();
        await service.create(user.id, {
            name: 'ANTHROPIC_API_KEY', value: 'sk-anthropic'
        });
        await service.create(user.id, {
            name: 'custom_value', value: '  value=with spaces  '
        });

        const all = await service.resolveEnvFor(user.id);
        expect(all).toContain('ANTHROPIC_API_KEY=sk-anthropic');
        expect(all).toContain('custom_value=  value=with spaces  ');

        const filtered = await service.resolveEnvFor(user.id, ['ANTHROPIC_API_KEY']);
        expect(filtered).toEqual(['ANTHROPIC_API_KEY=sk-anthropic']);
    });
});
