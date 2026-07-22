import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';

/**
 * Public liveness probe. Server-only route (no wire types in contracts): mounts at the module
 * prefix root, so a plain `GET /health` returns 200 for uptime checks and load-balancer health.
 */
export default class HealthController extends BaseController{
    @Route('/', 'GET')
    check(){
        return { status: 'ok' };
    }
}
