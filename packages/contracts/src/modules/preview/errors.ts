import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const PreviewErrors = {
    domain: 'Preview',
    causes: {
        NotFound: 404,
        InvalidPort: 400,
        PortReserved: 400
    }
} as const satisfies ErrorTable;

export type PreviewErrorCode = ErrorCode<typeof PreviewErrors>;
