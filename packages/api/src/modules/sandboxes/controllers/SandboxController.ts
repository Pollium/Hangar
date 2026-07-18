import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import SandboxService from '../services/SandboxService';
import { sandboxRoutes } from '@cloud-code/contracts/modules/sandbox/routes';

@Middleware(AuthenticatedRoute)
export default class SandboxController extends BaseController{
    #service = new SandboxService();

    @Route(sandboxRoutes.get)
    get(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.status(userId, projectId);
    }

    @Route(sandboxRoutes.provision)
    @Status(201)
    provision(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.provision(userId, projectId);
    }

    @Route(sandboxRoutes.start)
    start(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.start(userId, projectId);
    }

    @Route(sandboxRoutes.stop)
    stop(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.stop(userId, projectId);
    }

    @Route(sandboxRoutes.usage)
    usage(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.usage(userId, projectId);
    }

    @Route(sandboxRoutes.destroy)
    destroy(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.destroy(userId, projectId);
    }
}
