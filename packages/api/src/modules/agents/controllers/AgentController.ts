import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import AgentService from '../services/AgentService';
import { agentRoutes } from '@cloud-code/contracts/modules/agent/routes';
import { CreateAgentInput } from '@cloud-code/contracts/modules/agent/http';

@Middleware(AuthenticatedRoute)
export default class AgentController extends BaseController{
    #service = new AgentService();

    @Route(agentRoutes.list)
    list(@CurrentUser() userId: number){
        return this.#service.list(userId);
    }

    @Route(agentRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @Body() body: CreateAgentInput){
        return this.#service.create(userId, body);
    }

    @Route(agentRoutes.remove)
    remove(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.remove(userId, id);
    }
}
