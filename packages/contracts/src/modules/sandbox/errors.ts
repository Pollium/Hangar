import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const SandboxErrors = {
    domain: 'Sandbox',
    causes: {
        NotFound: 404,
        NotProvisioned: 409,
        ProvisionFailed: 500
    }
} as const satisfies ErrorTable;

export type SandboxErrorCode = ErrorCode<typeof SandboxErrors>;
