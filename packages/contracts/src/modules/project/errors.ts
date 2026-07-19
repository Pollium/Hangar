import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const ProjectErrors = {
    domain: 'Project',
    causes: {
        NotFound: 404,
        Forbidden: 403,
        InvalidInvite: 404
    }
} as const satisfies ErrorTable;

export type ProjectErrorCode = ErrorCode<typeof ProjectErrors>;
