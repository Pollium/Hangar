import { get, post, del } from '../../shared/routing';
import type { CreateAgentInput } from './http';
import type { Agent, CreatedAgent } from './domain';

export const agentRoutes = {
    list: get<Agent[]>('/agents'),
    create: post<CreateAgentInput, CreatedAgent>('/agents'),
    remove: del('/agents/:id')
};
