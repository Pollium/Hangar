import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import CredentialService from '@/modules/credentials/services/CredentialService';
import { githubRoutes } from '@hangar/contracts/modules/github/routes';
import type { GithubRepo } from '@hangar/contracts/modules/github/domain';

interface GithubApiRepo{ full_name: string; clone_url: string; private: boolean; description: string | null; }

@Middleware(AuthenticatedRoute)
export default class GithubController extends BaseController{
    #credentials = new CredentialService();

    /** Repos the connected user can clone. Empty (not an error) when GitHub isn't connected. */
    @Route(githubRoutes.repos)
    async repos(@CurrentUser() userId: number): Promise<GithubRepo[]>{
        const token = await this.#credentials.getValue(userId, 'GITHUB_TOKEN');
        if(!token) return [];

        const res = await fetch(
            'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
            { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'hangar', Accept: 'application/vnd.github+json' } }
        );
        if(!res.ok) return [];

        const repos = await res.json() as GithubApiRepo[];
        return repos.map((repo) => ({
            fullName: repo.full_name,
            cloneUrl: repo.clone_url,
            private: repo.private,
            description: repo.description ?? null
        }));
    }
}
