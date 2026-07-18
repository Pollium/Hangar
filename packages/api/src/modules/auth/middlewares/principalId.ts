import { FastifyRequest } from 'fastify';
import { AuthError } from '../contracts/domain/errors';

/**
 * Reads the authenticated user's id off `req.principal`, throwing
 * `Auth::Unauthorized` (401) when no principal is set — i.e. the route was not
 * guarded by `AuthenticatedRoute`. Shared by the decorators that resolve
 * request inputs against the current user (`@CurrentUser`, `@Owned`).
 */
export const principalId = (req: FastifyRequest): number => {
    if(!req.principal) throw AuthError.Unauthorized();
    return req.principal.userId;
};
