import type { BaseEntity } from '../../shared/base';

/** Metadata only — the value and its ciphertext never cross the wire. */
export interface CredentialView extends BaseEntity{
    name: string;
}
