import { invalidateCache } from 'alova';
import { alova } from '@/app/alova';
import { call } from '@/shared/api/call';
import { projectRoutes } from '@hangar/contracts/modules/project/routes';
import { sandboxRoutes } from '@hangar/contracts/modules/sandbox/routes';
import { cliRoutes } from '@hangar/contracts/modules/cli/routes';
import { githubRoutes } from '@hangar/contracts/modules/github/routes';
import type { AddProjectRepositoryInput, CreateProjectInput, UpdateProjectInput } from '@hangar/contracts/modules/project/http';
import type { CloneRepoInput } from '@hangar/contracts/modules/sandbox/http';

// The default 30s GET cache would otherwise serve a stale, pre-membership-change project list
// to the next refresh() right after creating/joining/leaving a project.
const invalidateProjectsList = () => invalidateCache(alova.Get(projectRoutes.list.path));

export const projectApi = {
    list: () => call(projectRoutes.list),
    get: (id: number) => call(projectRoutes.get, { path: { id } }),
    create: async (body: CreateProjectInput) => {
        const project = await call(projectRoutes.create, { body });
        invalidateProjectsList();
        return project;
    },
    update: (id: number, body: UpdateProjectInput) => call(projectRoutes.update, { path: { id }, body }),
    remove: async (id: number) => {
        await call(projectRoutes.remove, { path: { id } });
        invalidateProjectsList();
    },
    rotateInvite: (id: number) => call(projectRoutes.rotateInvite, { path: { id } }),
    joinInvite: async (token: string) => {
        const project = await call(projectRoutes.joinInvite, { path: { token } });
        invalidateProjectsList();
        return project;
    },
    listRepositories: (id: number) => call(projectRoutes.listRepositories, { path: { id } }),
    addRepository: (id: number, body: AddProjectRepositoryInput) => call(projectRoutes.addRepository, { path: { id }, body }),
    removeRepository: (id: number, repoId: number) => call(projectRoutes.removeRepository, { path: { id, repoId } })
};

export const sandboxApi = {
    get: (projectId: number) => call(sandboxRoutes.get, { path: { projectId } }),
    provision: (projectId: number) => call(sandboxRoutes.provision, { path: { projectId } }),
    start: (projectId: number) => call(sandboxRoutes.start, { path: { projectId } }),
    stop: (projectId: number) => call(sandboxRoutes.stop, { path: { projectId } }),
    destroy: (projectId: number) => call(sandboxRoutes.destroy, { path: { projectId } }),
    clone: (projectId: number, body: CloneRepoInput) => call(sandboxRoutes.clone, { path: { projectId }, body })
};

export const cliApi = {
    list: () => call(cliRoutes.list)
};

export const githubApi = {
    repos: () => call(githubRoutes.repos)
};
