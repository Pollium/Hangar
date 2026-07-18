import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const AuthErrors = {
    domain: 'Auth',
    causes: {
        Unauthorized: 401,
        InvalidToken: 401,
        InvalidCredentials: 401,
        EmailAlreadyRegistered: 409,
        UsernameAlreadyTaken: 409,
        SignupDisabled: 403
    }
} as const satisfies ErrorTable;

export type AuthErrorCode = ErrorCode<typeof AuthErrors>;
