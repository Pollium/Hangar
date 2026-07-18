import { Link } from 'react-router-dom';
import { StatusDot } from '@/shared/components/ui/StatusDot';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

interface Props{
    session: Session;
    active: boolean;
}

export const SessionItem = ({ session, active }: Props) => (
    <Link
        to={`/sessions/${session.id}`}
        className={`mx-2 flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors ${
            active ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]'
        }`}
    >
        <StatusDot status={session.status} />
        <span className='flex min-w-0 flex-1 flex-col'>
            <span className={`truncate text-[13px] ${active ? 'font-medium text-foreground' : 'text-foreground/90'}`}>
                {session.title}
            </span>
            <span className='truncate font-mono text-[11px] text-muted/70'>{session.cliType}</span>
        </span>
    </Link>
);
