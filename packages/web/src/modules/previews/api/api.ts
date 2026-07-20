import { call } from '@/shared/api/call';
import { previewRoutes } from '@hangar/contracts/modules/preview/routes';
import type { PublishPortInput } from '@hangar/contracts/modules/preview/http';

export const previewApi = {
    list: (projectId: number) => call(previewRoutes.list, { path: { projectId } }),
    publish: (projectId: number, body: PublishPortInput) => call(previewRoutes.create, { path: { projectId }, body }),
    unpublish: (slug: string) => call(previewRoutes.remove, { path: { slug } })
};
