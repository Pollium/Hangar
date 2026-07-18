import type { BaseEntity } from '../../shared/base';

/** Metadata only — the secret and its ciphertext never cross the wire. */
export interface CredentialView extends BaseEntity{
    ownerId: number;
    provider: string;
    label: string;
    envVar: string;
}
