import type { SessionStatus } from '@hangar/contracts/modules/session/domain';

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
    starting: 'Starting',
    running: 'Running',
    waiting_input: 'Needs input',
    idle: 'Idle',
    stopped: 'Stopped',
    error: 'Error'
};

export const SESSION_STATUS_TEXT: Record<SessionStatus, string> = {
    starting: 'text-warning',
    running: 'text-success',
    waiting_input: 'text-warning',
    idle: 'text-muted',
    stopped: 'text-muted/60',
    error: 'text-danger'
};
