import { get, post, del } from '../../shared/routing';
import type { Sandbox, SandboxUsage } from './domain';

/** One sandbox per project, keyed by projectId. */
export const sandboxRoutes = {
    get: get<Sandbox>('/sandboxes/:projectId'),
    provision: post<void, Sandbox>('/sandboxes/:projectId'),
    start: post<void, Sandbox>('/sandboxes/:projectId/start'),
    stop: post<void, Sandbox>('/sandboxes/:projectId/stop'),
    usage: get<SandboxUsage>('/sandboxes/:projectId/usage'),
    destroy: del('/sandboxes/:projectId')
};
