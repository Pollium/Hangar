import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, NumericParam } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import CredentialService from '../services/CredentialService';
import { CreateCredentialInput } from '@hangar/contracts/modules/credential/http';
import { credentialRoutes } from '@hangar/contracts/modules/credential/routes';

@Middleware(AuthenticatedRoute)
export default class CredentialController extends BaseController{
    #service = new CredentialService();

    @Route(credentialRoutes.list)
    list(@CurrentUser() userId: number){
        return this.#service.list(userId);
    }

    @Route(credentialRoutes.create)
    @Status(201)
    create(@CurrentUser() userId: number, @Body() body: CreateCredentialInput){
        return this.#service.create(userId, body);
    }

    @Route(credentialRoutes.remove)
    remove(@CurrentUser() userId: number, @NumericParam('id') id: number){
        return this.#service.remove(userId, id);
    }
}
