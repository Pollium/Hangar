import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { listAdapters } from '../adapters/registry';
import { cliRoutes } from '@hangar/contracts/modules/cli/routes';
import type { CliDescriptor } from '@hangar/contracts/modules/cli/domain';

@Middleware(AuthenticatedRoute)
export default class CliController extends BaseController{
    @Route(cliRoutes.list)
    list(): CliDescriptor[]{
        return listAdapters().map((adapter) => ({
            id: adapter.id,
            label: adapter.label,
            requiredCredentials: adapter.requiredCredentials
        }));
    }
}
