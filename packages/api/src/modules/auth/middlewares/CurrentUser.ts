import { createParamDecorator } from '@/shared/controllers/params';
import { principalId } from './principalId';

/**
 * Injects the authenticated user's id (`req.principal.userId`). Throws
 * `Auth::Unauthorized` (401) when no principal is set — i.e. the route was not
 * guarded by `AuthenticatedRoute`. Lives in the auth module (not `shared/`)
 * because reading the principal is auth-domain semantics, like the guard that
 * sets it.
 */
export const CurrentUser = (): ParameterDecorator => createParamDecorator(principalId);
