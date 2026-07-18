import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import ScheduledTaskService from '../services/ScheduledTaskService';
import { CreateScheduledTaskInput, UpdateScheduledTaskInput } from '@cloud-code/contracts/modules/task/http';
import { taskRoutes } from '@cloud-code/contracts/modules/task/routes';

@Middleware(AuthenticatedRoute)
export default class ScheduledTaskController extends BaseController{
    #service = new ScheduledTaskService();

    @Route(taskRoutes.list)
    list(@CurrentUser() userId: number){
        return this.#service.list(userId);
    }

    @Route(taskRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @Body() body: CreateScheduledTaskInput){
        return this.#service.create(userId, body);
    }

    @Route(taskRoutes.update)
    update(@CurrentUser() userId: number, @NumericParam('id') id: number, @Body() body: UpdateScheduledTaskInput){
        return this.#service.update(userId, id, body);
    }

    @Route(taskRoutes.remove)
    remove(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.remove(userId, id);
    }
}
