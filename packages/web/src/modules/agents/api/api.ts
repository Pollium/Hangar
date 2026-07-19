import { invalidateCache } from 'alova';
import { alova } from '@/app/alova';
import { call } from '@/shared/api/call';
import { agentRoutes } from '@hangar/contracts/modules/agent/routes';
import type { CreateAgentInput } from '@hangar/contracts/modules/agent/http';

const invalidateList = () => invalidateCache(alova.Get(agentRoutes.list.path));

export const agentApi = {
    list: () => call(agentRoutes.list),
    create: async (body: CreateAgentInput) => {
        const created = await call(agentRoutes.create, { body });
        invalidateList();
        return created;
    },
    remove: async (id: number) => {
        await call(agentRoutes.remove, { path: { id } });
        invalidateList();
    }
};
