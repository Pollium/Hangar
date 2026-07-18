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

export const SessionCard = ({ session }: { session: Session }) => (
    <Link
        to={`/sessions/${session.id}`}
        className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-foreground/5 ${
            session.status === 'waiting_input' ? 'border-amber-500/50' : 'border-foreground/10'
        }`}
    >
        <div className='flex items-center gap-2'>
            <span className={`size-2 shrink-0 rounded-full ${STATUS_COLOR[session.status]}`} />
            <span className='truncate text-sm font-medium text-foreground'>{session.title}</span>
        </div>
        <div className='flex items-center justify-between text-xs text-muted'>
            <span>{session.cliType}</span>
            <span>{session.status.replace('_', ' ')}</span>
        </div>
    </Link>
);
