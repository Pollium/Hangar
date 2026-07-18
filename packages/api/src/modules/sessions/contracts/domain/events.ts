import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';

export interface SessionStatusChangedPayload{
    sessionId: number;
    ownerId: number;
    status: SessionStatus;
}

export interface SessionAttentionPayload{
    sessionId: number;
    ownerId: number;
    title: string;
}
