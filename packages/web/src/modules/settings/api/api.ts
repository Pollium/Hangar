import { call } from '@/shared/api/call';
import { credentialRoutes } from '@cloud-code/contracts/modules/credential/routes';
import type { CreateCredentialInput } from '@cloud-code/contracts/modules/credential/http';

export const credentialApi = {
    list: () => call(credentialRoutes.list),
    create: (body: CreateCredentialInput) => call(credentialRoutes.create, { body }),
    remove: (id: number) => call(credentialRoutes.remove, { path: { id } })
};
