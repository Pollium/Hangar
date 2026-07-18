import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const CredentialErrors = {
    domain: 'Credential',
    causes: {
        NotFound: 404,
        Forbidden: 403
    }
} as const satisfies ErrorTable;

export type CredentialErrorCode = ErrorCode<typeof CredentialErrors>;
