import { get } from '../../shared/routing';
import type { GithubRepo } from './domain';

export const githubRoutes = {
    // Repos the connected user can clone. Empty when GitHub isn't connected.
    repos: get<GithubRepo[]>('/integrations/github/repos')
};
