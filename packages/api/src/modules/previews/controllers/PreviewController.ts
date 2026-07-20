import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam, Param } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import PreviewService from '../services/PreviewService';
import { previewRoutes } from '@hangar/contracts/modules/preview/routes';
import type { PublishPortInput } from '@hangar/contracts/modules/preview/http';

@Middleware(AuthenticatedRoute)
export default class PreviewController extends BaseController{
    #service = new PreviewService();

    @Route(previewRoutes.list)
    list(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.list(userId, projectId);
    }

    @Route(previewRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: PublishPortInput){
        return this.#service.publish(userId, projectId, body.port, body.label);
    }

    @Route(previewRoutes.remove)
    remove(@CurrentUser() userId: number, @Param('slug') slug: string){
        return this.#service.unpublish(userId, slug);
    }
}
