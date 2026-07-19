import type { SessionStatus } from '@hangar/contracts/modules/session/domain';

export interface SessionStatusChangedPayload{
    sessionId: number;
    ownerId: number;
    projectId: number;
    status: SessionStatus;
}

export interface SessionRemovedPayload{
    sessionId: number;
    ownerId: number;
    projectId: number;
}

export interface SessionAttentionPayload{
    sessionId: number;
    ownerId: number;
    projectId: number;
    title: string;
}
