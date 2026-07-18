import { describe, expect, it } from 'vitest';
import { sessionRoutes } from '@cloud-code/contracts/modules/session/routes';
import { useApp } from '@tests/harness';
import { request, expectError } from '@tests/request';
import { userSeed } from '@/modules/user/tests/UserSeed';
import { projectSeed } from '@/modules/projects/tests/ProjectSeed';

describe('SessionController', () => {
    const ctx = useApp();

    it('creates a session in the starting state', async () => {
        const user = await userSeed.user();
        const project = await projectSeed.project(user);

        const res = await request(ctx.app, sessionRoutes.create, {
            as: user.id,
            body: { projectId: project.id, cliType: 'claude-code', title: 'Fix the bug' }
        });

        expect(res.status).toBe(201);
        expect(res.data().status).toBe('starting');
        expect(res.data().cliType).toBe('claude-code');
        expect(res.data().cwd).toBe('/workspace');
    });

    it('rejects an unknown cli', async () => {
        const user = await userSeed.user();
        const project = await projectSeed.project(user);

        const res = await request(ctx.app, sessionRoutes.create, {
            as: user.id,
            body: { projectId: project.id, cliType: 'not-a-cli' }
        });

        expectError(res, 404, 'Cli::UnknownCli:not-a-cli');
    });

    it('cannot create a session in another user project', async () => {
        const [alice, bob] = [await userSeed.user(), await userSeed.user()];
        const project = await projectSeed.project(bob);

        const res = await request(ctx.app, sessionRoutes.create, {
            as: alice.id,
            body: { projectId: project.id, cliType: 'claude-code' }
        });

        expectError(res, 403, 'Project::Forbidden');
    });

    it('lists sessions filtered by project', async () => {
        const user = await userSeed.user();
        const [a, b] = [await projectSeed.project(user), await projectSeed.project(user)];
        await request(ctx.app, sessionRoutes.create, { as: user.id, body: { projectId: a.id, cliType: 'codex' } });
        await request(ctx.app, sessionRoutes.create, { as: user.id, body: { projectId: b.id, cliType: 'codex' } });

        const all = await request(ctx.app, sessionRoutes.list, { as: user.id });
        expect(all.data()).toHaveLength(2);

        const scoped = await request(ctx.app, sessionRoutes.list, { as: user.id, query: { projectId: a.id } });
        expect(scoped.data()).toHaveLength(1);
    });

    it('stops and removes a session', async () => {
        const user = await userSeed.user();
        const project = await projectSeed.project(user);
        const created = await request(ctx.app, sessionRoutes.create, {
            as: user.id,
            body: { projectId: project.id, cliType: 'claude-code' }
        });
        const id = created.data().id;

        const stopped = await request(ctx.app, sessionRoutes.stop, { as: user.id, params: { id } });
        expect(stopped.data().status).toBe('stopped');

        const removed = await request(ctx.app, sessionRoutes.remove, { as: user.id, params: { id } });
        expect(removed.status).toBe(204);
    });
});
