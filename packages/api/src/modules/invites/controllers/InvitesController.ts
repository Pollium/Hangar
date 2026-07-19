import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Param } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import ProjectService from '@/modules/projects/services/ProjectService';
import { projectRoutes } from '@cloud-code/contracts/modules/project/routes';

/** Own module (mount prefix `/invites`) because joining an invite is deliberately not gated
 * by project membership — the whole point is to grant it. */
@Middleware(AuthenticatedRoute)
export default class InvitesController extends BaseController{
    #projects = new ProjectService();

    @Route(projectRoutes.joinInvite)
    join(@CurrentUser() userId: number, @Param('token') token: string){
        return this.#projects.joinByInvite(userId, token);
    }
}
