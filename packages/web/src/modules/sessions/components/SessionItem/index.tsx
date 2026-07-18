import { Link } from 'react-router-dom';
import type { Session, SessionStatus } from '@cloud-code/contracts/modules/session/domain';

const STATUS_COLOR: Record<SessionStatus, string> = {
    starting: 'bg-yellow-400',
    running: 'bg-green-500',
    waiting_input: 'bg-amber-500',
    idle: 'bg-zinc-500',
    stopped: 'bg-red-500',
    error: 'bg-red-600'
};

const STATUS_LABEL: Record<SessionStatus, string> = {
    starting: 'Starting',
    running: 'Running',
    waiting_input: 'Needs input',
    idle: 'Idle',
    stopped: 'Stopped',
    error: 'Error'
};

interface Props{
    session: Session;
    active: boolean;
}

export const SessionItem = ({ session, active }: Props) => (
    <Link
        to={`/sessions/${session.id}`}
        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
            active ? 'bg-foreground/10' : 'hover:bg-foreground/5'
        }`}
    >
        <span
            className={`size-2 shrink-0 rounded-full ${STATUS_COLOR[session.status]} ${
                session.status === 'running' ? 'animate-pulse' : ''
            }`}
            title={STATUS_LABEL[session.status]}
            aria-label={STATUS_LABEL[session.status]}
        />
        <span className='flex min-w-0 flex-1 flex-col'>
            <span className='truncate text-[0.8125rem] font-medium text-foreground'>{session.title}</span>
            <span className='truncate text-xs text-muted'>{session.cliType}</span>
        </span>
    </Link>
);
