import { call } from '@/shared/api/call';
import { codespaceRoutes } from '@cloud-code/contracts/modules/codespace/routes';

export const codespaceApi = {
    // Ensures the project's code-server is up and returns the iframe ticket.
    token: (projectId: number) => call(codespaceRoutes.token, { path: { projectId } })
};
