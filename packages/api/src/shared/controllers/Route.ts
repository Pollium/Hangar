import ClassMetadata from '@/core/utils/ClassMetadata';
import { HttpMethod, RouteDefinition } from '@/shared/contracts/routing';
import type { Endpoint } from '@cloud-code/contracts/shared/routing';

const routesByController = new ClassMetadata<RouteDefinition>();

/**
 * Mounts a handler. Prefer the contracts form — `@Route(roadmapRoutes.create)` — where the
 * full path and method come from the module's `@cloud-code/contracts` route table (single source
 * shared with the web client). The `(path, method)` string form remains for server-only
 * routes whose wire types are not in contracts yet.
 */
export const Route = <I, O>(route: string | Endpoint<I, O>, method: string = 'GET'): MethodDecorator => {
    return (target, handlerName) => {
        const definition = typeof route === 'string'
            ? { path: route, method: method.toUpperCase() as HttpMethod, absolute: false }
            : { path: route.path, method: route.method, absolute: true };

        routesByController.append(target.constructor, { ...definition, handlerName });
    };
};

export const getRoutes = (ctor: object): RouteDefinition[] => {
    return routesByController.get(ctor);
};
