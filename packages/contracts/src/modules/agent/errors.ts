import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const AgentErrors = {
    domain: 'Agent',
    causes: {
        Unauthorized: 401,
        NotFound: 404,
        NoAgentConnected: 409
    }
} as const satisfies ErrorTable;

export type AgentErrorCode = ErrorCode<typeof AgentErrors>;
