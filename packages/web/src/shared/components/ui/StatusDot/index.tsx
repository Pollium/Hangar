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

interface Props{
    status: SessionStatus;
    pulse?: boolean;
    decorative?: boolean;
}

export const StatusDot = ({ status, pulse = true, decorative = false }: Props) => (
    <span
        className={`size-1.5 shrink-0 rounded-full ${COLOR[status]} ${
            pulse && (status === 'running' || status === 'waiting_input') ? 'animate-pulse' : ''
        }`}
        title={decorative ? undefined : STATUS_LABEL[status]}
        aria-label={decorative ? undefined : STATUS_LABEL[status]}
        aria-hidden={decorative || undefined}
    />
);
