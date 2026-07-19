import { call } from '@/shared/api/call';
import { sessionRoutes } from '@cloud-code/contracts/modules/session/routes';
import type { CreateSessionInput } from '@cloud-code/contracts/modules/session/http';

export const sessionApi = {
    list: (projectId: number) => call(sessionRoutes.list, { query: { projectId } }),
    get: (id: number) => call(sessionRoutes.get, { path: { id } }),
    create: (body: CreateSessionInput) => call(sessionRoutes.create, { body }),
    stop: (id: number) => call(sessionRoutes.stop, { path: { id } }),
    remove: (id: number) => call(sessionRoutes.remove, { path: { id } }),
    switchCli: (id: number, cliType: string) => call(sessionRoutes.switchCli, { path: { id }, body: { cliType } })
};
