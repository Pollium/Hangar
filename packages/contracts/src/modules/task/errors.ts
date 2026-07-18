import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const ScheduledTaskErrors = {
    domain: 'ScheduledTask',
    causes: {
        NotFound: 404,
        Forbidden: 403
    }
} as const satisfies ErrorTable;

export type ScheduledTaskErrorCode = ErrorCode<typeof ScheduledTaskErrors>;
