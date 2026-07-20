import { get, post, del } from '../../shared/routing';
import type { PublishedAppView } from './domain';
import type { PublishPortInput } from './http';

// Paths live under the module prefix (/previews) — BaseController asserts this at boot.
export const previewRoutes = {
    // Apps published for a project (its sandbox container).
    list: get<PublishedAppView[]>('/previews/project/:projectId'),
    // Publish a port; mints an unguessable slug and returns its public URL.
    create: post<PublishPortInput, PublishedAppView>('/previews/project/:projectId'),
    // Revoke a published port by slug.
    remove: del('/previews/:slug')
};
