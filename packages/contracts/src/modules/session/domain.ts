import type { BaseEntity } from '../../shared/base';

export type SessionStatus =
    | 'starting'
    | 'running'
    | 'waiting_input'
    | 'idle'
    | 'stopped'
    | 'error';

export interface Session extends BaseEntity{
    projectId: number;
    ownerId: number;
    title: string;
    cliType: string;
    status: SessionStatus;
    containerId: string | null;
    tmuxWindow: string | null;
    cwd: string;
    lastActiveAt: string | null;
}

export type SessionEventKind = 'output' | 'input' | 'status';

export interface SessionEvent extends BaseEntity{
    sessionId: number;
    kind: SessionEventKind;
    data: string;
}
