import { alova } from '@/app/alova';
import type { Endpoint } from '@cloud-code/contracts/shared/routing';

type PathValues = Record<string, string | number>;

export interface CallOptions<I>{
    path?: PathValues;
    query?: object;
    body?: I;
}

/** Fills `:params` in a contract path; a missing value fails loud instead of hitting the API raw. */
export const interpolatePath = (path: string, values: PathValues = {}): string =>
    path.replace(/:(\w+)/g, (_, name: string) => {
        const value = values[name];
        if(value === undefined) throw new Error(`Missing path param ":${name}" for ${path}`);
        return encodeURIComponent(value);
    });

/**
 * Builds the alova request for a contracts `Endpoint` — method, path, and the response type
 * all come from the route table, so a renamed path or changed payload breaks here at compile
 * time instead of at runtime.
 */
export const call = <I, O>(endpoint: Endpoint<I, O>, options: CallOptions<I> = {}) => {
    const url = interpolatePath(endpoint.path, options.path);
    const config = options.query ? { params: options.query as Record<string, unknown> } : undefined;
    // DTOs are interfaces (no index signature); alova wants a Record-shaped body.
    const body = options.body as Record<string, unknown> | undefined;

    switch(endpoint.method){
        case 'POST': return alova.Post<O>(url, body, config);
        case 'PATCH': return alova.Patch<O>(url, body, config);
        case 'PUT': return alova.Put<O>(url, body, config);
        case 'DELETE': return alova.Delete<O>(url, body, config);
        default: return alova.Get<O>(url, config);
    }
};
