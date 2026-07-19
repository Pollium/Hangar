import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import CodespaceService from '../services/CodespaceService';
import { codespaceRoutes } from '@cloud-code/contracts/modules/codespace/routes';
import type { CodespaceTicket } from '@cloud-code/contracts/modules/codespace/domain';

@Middleware(AuthenticatedRoute)
export default class CodespaceController extends BaseController{
    #service = new CodespaceService();

    @Route(codespaceRoutes.token)
    async token(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number): Promise<CodespaceTicket>{
        await this.#service.ensureRunning(userId, projectId);
        return { token: this.#service.issueToken(userId, projectId), path: `/codespace/${projectId}/` };
    }
}
