import { invalidateCache } from 'alova';
import { alova } from '@/app/alova';
import { call } from '@/shared/api/call';
import { credentialRoutes } from '@hangar/contracts/modules/credential/routes';
import type { CreateCredentialInput } from '@hangar/contracts/modules/credential/http';

// GET responses are cached (see alova cacheFor), so a create/remove must drop the list cache
// or the next refresh replays stale rows — e.g. a deleted variable would reappear.
const invalidateList = () => invalidateCache(alova.Get(credentialRoutes.list.path));

export const credentialApi = {
    list: () => call(credentialRoutes.list),
    create: async (body: CreateCredentialInput) => {
        const created = await call(credentialRoutes.create, { body });
        invalidateList();
        return created;
    },
    remove: async (id: number) => {
        await call(credentialRoutes.remove, { path: { id } });
        invalidateList();
    }
};
