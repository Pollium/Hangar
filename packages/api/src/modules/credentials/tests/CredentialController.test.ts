import { describe, expect, it } from 'vitest';
import { credentialRoutes } from '@cloud-code/contracts/modules/credential/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from '@/modules/user/tests/UserSeed';
import CredentialService from '../services/CredentialService';

describe('CredentialController', () => {
    const ctx = useApp();

    it('creates a credential without ever revealing the secret', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, credentialRoutes.create, {
            as: user.id,
            body: { provider: 'anthropic', label: 'Personal', envVar: 'ANTHROPIC_API_KEY', secret: 'sk-secret-123' }
        });

        expect(res.status).toBe(201);
        expect(res.body).not.toContain('sk-secret-123');
        expect(res.body).not.toContain('ciphertext');
        expect(res.data().envVar).toBe('ANTHROPIC_API_KEY');
    });

    it('lists credentials as metadata only', async () => {
        const user = await userSeed.user();
        await new CredentialService().create(user.id, {
            provider: 'openai', label: 'Work', envVar: 'OPENAI_API_KEY', secret: 'sk-openai'
        });

        const res = await request(ctx.app, credentialRoutes.list, { as: user.id });

        expect(res.data()).toHaveLength(1);
        expect(res.body).not.toContain('sk-openai');
    });

    it('forbids deleting another user credential', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        const credential = await new CredentialService().create(bob.id, {
            provider: 'anthropic', label: 'Bob', envVar: 'ANTHROPIC_API_KEY', secret: 'sk-bob'
        });

        const res = await request(ctx.app, credentialRoutes.remove, { as: alice.id, params: { id: credential.id } });

        expectError(res, 403, 'Credential::Forbidden');
    });

    it('resolves decrypted env entries for the owner', async () => {
        const user = await userSeed.user();
        const service = new CredentialService();
        await service.create(user.id, {
            provider: 'anthropic', label: 'A', envVar: 'ANTHROPIC_API_KEY', secret: 'sk-anthropic'
        });
        await service.create(user.id, {
            provider: 'git', label: 'G', envVar: 'GIT_TOKEN', secret: 'ghp-token'
        });

        const all = await service.resolveEnvFor(user.id);
        expect(all).toContain('ANTHROPIC_API_KEY=sk-anthropic');
        expect(all).toContain('GIT_TOKEN=ghp-token');

        const filtered = await service.resolveEnvFor(user.id, ['ANTHROPIC_API_KEY']);
        expect(filtered).toEqual(['ANTHROPIC_API_KEY=sk-anthropic']);
    });
});
