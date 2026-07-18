import { get, post, del } from '../../shared/routing';
import type { CreateCredentialInput } from './http';
import type { CredentialView } from './domain';

export const credentialRoutes = {
    list: get<CredentialView[]>('/credentials'),
    create: post<CreateCredentialInput, CredentialView>('/credentials'),
    remove: del('/credentials/:id')
};
