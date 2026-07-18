import { call } from '@/shared/api/call';
import { projectRoutes } from '@cloud-code/contracts/modules/project/routes';
import { sandboxRoutes } from '@cloud-code/contracts/modules/sandbox/routes';
import { cliRoutes } from '@cloud-code/contracts/modules/cli/routes';
import type { CreateProjectInput, UpdateProjectInput } from '@cloud-code/contracts/modules/project/http';

export const projectApi = {
    list: () => call(projectRoutes.list),
    get: (id: number) => call(projectRoutes.get, { path: { id } }),
    create: (body: CreateProjectInput) => call(projectRoutes.create, { body }),
    update: (id: number, body: UpdateProjectInput) => call(projectRoutes.update, { path: { id }, body }),
    remove: (id: number) => call(projectRoutes.remove, { path: { id } })
};

export const sandboxApi = {
    get: (projectId: number) => call(sandboxRoutes.get, { path: { projectId } }),
    provision: (projectId: number) => call(sandboxRoutes.provision, { path: { projectId } }),
    start: (projectId: number) => call(sandboxRoutes.start, { path: { projectId } }),
    stop: (projectId: number) => call(sandboxRoutes.stop, { path: { projectId } }),
    destroy: (projectId: number) => call(sandboxRoutes.destroy, { path: { projectId } })
};

export const cliApi = {
    list: () => call(cliRoutes.list)
};
