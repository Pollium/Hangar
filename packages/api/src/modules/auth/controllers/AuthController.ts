import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Body, Query } from '@/shared/controllers/RequestParams';
import { RateLimit } from '@/shared/middlewares/RateLimit';
import AuthService from '../services/AuthService';
import { SignInInput, SignUpInput } from '@cloud-code/contracts/modules/auth/http';
import { authRoutes } from '@cloud-code/contracts/modules/auth/routes';

export default class AuthController extends BaseController{
    #service = new AuthService();

    @Route(authRoutes.signIn)
    @RateLimit({ max: 5, window: '1m' })
    signIn(@Body() body: SignInInput){
        return this.#service.signIn(body);
    }

    @Route(authRoutes.signUp)
    @RateLimit({ max: 5, window: '1h' })
    @Status(201)
    signUp(@Body() body: SignUpInput){
        return this.#service.signUp(body);
    }

    @Route(authRoutes.checkEmail)
    @RateLimit({ max: 3, window: '15m' })
    checkEmail(@Query('email') email: string | undefined){
        return this.#service.checkEmail(email);
    }
}
