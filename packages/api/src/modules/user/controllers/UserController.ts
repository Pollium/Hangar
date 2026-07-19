import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import UserService from '../services/UserService';
import { UpdateProfileInput, ChangePasswordInput } from '@hangar/contracts/modules/user/http';
import { userRoutes } from '@hangar/contracts/modules/user/routes';

@Middleware(AuthenticatedRoute)
export default class UserController extends BaseController{
    #service = new UserService();

    @Route(userRoutes.me)
    getProfile(@CurrentUser() userId: number){
        return this.#service.getProfile(userId);
    }

    @Route(userRoutes.updateProfile)
    updateProfile(@CurrentUser() userId: number, @Body() body: UpdateProfileInput){
        return this.#service.updateProfile(userId, body);
    }

    @Route(userRoutes.changePassword)
    changePassword(@CurrentUser() userId: number, @Body() body: ChangePasswordInput){
        return this.#service.changePassword(userId, body);
    }

    @Route(userRoutes.deleteMe)
    deleteProfile(@CurrentUser() userId: number){
        return this.#service.deleteProfile(userId);
    }
}
