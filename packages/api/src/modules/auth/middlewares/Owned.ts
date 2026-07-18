import { createParamDecorator } from '@/shared/controllers/params';
import { parseId } from '@/shared/controllers/parseId';
import { OwnedResolver } from '@/shared/contracts/ownership';
import { principalId } from './principalId';

/**
 * Injects the entity addressed by the route, loaded and authorized for the
 * current user, by delegating to the service's `getOwned(userId, id)`
 * (`OwnedResolver<T>`): load → 404, ownership → 403. Subsumes
 * `@NumericParam(param)` — the id is parsed here (400 `Request::InvalidId`)
 * before the service runs. Like `@CurrentUser`, it reads `req.principal`
 * (auth-domain semantics, hence this module) and throws `Auth::Unauthorized`
 * without one, so only use it behind `@Middleware(AuthenticatedRoute)`.
 * Convention: declare `@Owned` as the first handler parameter.
 */
export const Owned = <T>(Service: new () => OwnedResolver<T>, param = 'id'): ParameterDecorator =>
    createParamDecorator((req) => {
        const userId = principalId(req);
        const id = parseId((req.params as Record<string, string>)[param]);
        return new Service().getOwned(userId, id);
    });
