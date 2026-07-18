import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const SessionErrors = {
    domain: 'Session',
    causes: {
        NotFound: 404,
        Forbidden: 403,
        NotJoined: 409,
        NotRunning: 409
    }
} as const satisfies ErrorTable;

export type SessionErrorCode = ErrorCode<typeof SessionErrors>;
