import { alova } from '@/app/alova';
import { call } from '@/shared/api/call';
import { agentRoutes } from '@hangar/contracts/modules/agent/routes';
import type { CreateAgentInput } from '@hangar/contracts/modules/agent/http';
import type { Agent } from '@hangar/contracts/modules/agent/domain';

export const agentApi = {
    // Status (online/offline) is computed live per request from the tunnel registry — never cache
    // it, or a delete or a fresh connection only shows after a hard refresh.
    list: () => alova.Get<Agent[]>(agentRoutes.list.path, { cacheFor: 0 }),
    create: (body: CreateAgentInput) => call(agentRoutes.create, { body }),
    remove: (id: number) => call(agentRoutes.remove, { path: { id } })
};
