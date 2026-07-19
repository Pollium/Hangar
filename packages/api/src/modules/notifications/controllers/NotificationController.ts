import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import NotificationService from '../services/NotificationService';
import { notificationRoutes } from '@hangar/contracts/modules/notification/routes';

@Middleware(AuthenticatedRoute)
export default class NotificationController extends BaseController{
    #service = new NotificationService();

    @Route(notificationRoutes.list)
    list(@CurrentUser() userId: number){
        return this.#service.list(userId);
    }

    @Route(notificationRoutes.markRead)
    markRead(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.markRead(userId, id);
    }

    @Route(notificationRoutes.markAllRead)
    markAllRead(@CurrentUser() userId: number){
        return this.#service.markAllRead(userId);
    }
}
