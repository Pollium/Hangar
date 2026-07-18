import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const UserErrors = {
    domain: 'User',
    causes: {
        InvalidPassword: 401,
        NotFound: 404,
        UsernameAlreadyTaken: 409
    }
} as const satisfies ErrorTable;

export type UserErrorCode = ErrorCode<typeof UserErrors>;
