import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import ProjectService from '../services/ProjectService';
import {
    AddProjectRepositoryInput,
    CreateProjectInput,
    UpdateProjectInput
} from '@cloud-code/contracts/modules/project/http';
import { projectRoutes } from '@cloud-code/contracts/modules/project/routes';

@Middleware(AuthenticatedRoute)
export default class ProjectController extends BaseController{
    #service = new ProjectService();

    @Route(projectRoutes.list)
    list(@CurrentUser() userId: number){
        return this.#service.list(userId);
    }

    @Route(projectRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @Body() body: CreateProjectInput){
        return this.#service.create(userId, body);
    }

    @Route(projectRoutes.get)
    get(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.get(userId, id);
    }

    @Route(projectRoutes.update)
    update(@CurrentUser() userId: number, @NumericParam('id') id: number, @Body() body: UpdateProjectInput){
        return this.#service.update(userId, id, body);
    }

    @Route(projectRoutes.remove)
    remove(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.remove(userId, id);
    }

    @Route(projectRoutes.rotateInvite)
    rotateInvite(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.rotateInvite(userId, id);
    }

    @Route(projectRoutes.listRepositories)
    listRepositories(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.listRepositories(userId, id);
    }

    @Route(projectRoutes.addRepository)
    addRepository(@CurrentUser() userId: number, @NumericParam('id') id: number, @Body() body: AddProjectRepositoryInput){
        return this.#service.addRepository(userId, id, body);
    }

    @Route(projectRoutes.removeRepository)
    removeRepository(@CurrentUser() userId: number, @NumericParam('id') id: number, @NumericParam('repoId') repoId: number){
        return this.#service.removeRepository(userId, id, repoId);
    }
}
