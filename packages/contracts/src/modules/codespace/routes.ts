import { post } from '../../shared/routing';
import type { CodespaceTicket } from './domain';

export const codespaceRoutes = {
    // Ensures the project's code-server is up and returns a short-lived iframe ticket.
    token: post<void, CodespaceTicket>('/codespaces/:projectId/token')
};
