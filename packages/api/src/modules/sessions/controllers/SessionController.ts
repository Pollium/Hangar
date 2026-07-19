import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam, NumericQuery } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import SessionService from '../services/SessionService';
import { CreateSessionInput, UpdateSessionCliInput } from '@cloud-code/contracts/modules/session/http';
import { sessionRoutes } from '@cloud-code/contracts/modules/session/routes';

@Middleware(AuthenticatedRoute)
export default class SessionController extends BaseController{
    #service = new SessionService();

    @Route(sessionRoutes.list)
    list(@CurrentUser() userId: number, @NumericQuery('projectId') projectId: number){
        return this.#service.list(userId, projectId);
    }

    @Route(sessionRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @Body() body: CreateSessionInput){
        return this.#service.create(userId, body);
    }

    @Route(sessionRoutes.get)
    get(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.get(userId, id);
    }

    @Route(sessionRoutes.stop)
    stop(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.stop(userId, id);
    }

    @Route(sessionRoutes.switchCli)
    switchCli(@CurrentUser() userId: number, @NumericParam('id') id: number, @Body() body: UpdateSessionCliInput){
        return this.#service.switchCli(userId, id, body.cliType);
    }

    @Route(sessionRoutes.remove)
    remove(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.remove(userId, id);
    }

    @Route(sessionRoutes.events)
    events(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.events(userId, id);
    }
}
