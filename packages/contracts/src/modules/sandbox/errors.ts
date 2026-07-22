import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const SandboxErrors = {
    domain: 'Sandbox',
    causes: {
        NotFound: 404,
        NotProvisioned: 409,
        ProvisionFailed: 500,
        InvalidPath: 400,
        CloneFailed: 502,
        FileOperationFailed: 502
    }
} as const satisfies ErrorTable;

export type SandboxErrorCode = ErrorCode<typeof SandboxErrors>;
