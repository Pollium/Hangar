import type { SessionStatus } from '@cloud-code/contracts/modules/session/domain';

const COLOR: Record<SessionStatus, string> = {
    starting: 'bg-warning',
    running: 'bg-success',
    waiting_input: 'bg-warning',
    idle: 'bg-muted',
    stopped: 'bg-danger',
    error: 'bg-danger'
};

export const STATUS_LABEL: Record<SessionStatus, string> = {
    starting: 'Starting',
    running: 'Running',
    waiting_input: 'Needs input',
    idle: 'Idle',
    stopped: 'Stopped',
    error: 'Error'
};

export const StatusDot = ({ status, pulse = true }: { status: SessionStatus; pulse?: boolean }) => (
    <span
        className={`size-1.5 shrink-0 rounded-full ${COLOR[status]} ${
            pulse && (status === 'running' || status === 'waiting_input') ? 'animate-pulse' : ''
        }`}
        title={STATUS_LABEL[status]}
        aria-label={STATUS_LABEL[status]}
    />
);
