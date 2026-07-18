import { describe, expect, it } from 'vitest';
import { projectRoutes } from '@cloud-code/contracts/modules/project/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from './ProjectSeed';

describe('ProjectController', () => {
    const ctx = useApp();

    it('creates a project owned by the caller', async () => {
        const user = await userSeed.user();

        const res = await request(ctx.app, projectRoutes.create, {
            as: user.id,
            body: { name: 'API', description: 'the backend', defaultCli: 'claude-code' }
        });

        expect(res.status).toBe(201);
        expect(res.data().name).toBe('API');
        expect(res.data().ownerId).toBe(user.id);
        // baseImage defaults when omitted
        expect(res.data().baseImage).toContain('sandbox-base');
    });

    it('lists only the caller projects', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        await projectSeed.project(alice);
        await projectSeed.project(bob);

        const res = await request(ctx.app, projectRoutes.list, { as: alice.id });

        expect(res.status).toBe(200);
        expect(res.data()).toHaveLength(1);
    });

    it('forbids reading another user project', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        const project = await projectSeed.project(bob);

        const res = await request(ctx.app, projectRoutes.get, { as: alice.id, params: { id: project.id } });

        expectError(res, 403, 'Project::Forbidden');
    });

    it('updates and removes a project', async () => {
        const user = await userSeed.user();
        const project = await projectSeed.project(user);

        const updated = await request(ctx.app, projectRoutes.update, {
            as: user.id,
            params: { id: project.id },
            body: { name: 'renamed' }
        });
        expect(updated.data().name).toBe('renamed');

        const removed = await request(ctx.app, projectRoutes.remove, { as: user.id, params: { id: project.id } });
        expect(removed.status).toBe(204);
    });
});
