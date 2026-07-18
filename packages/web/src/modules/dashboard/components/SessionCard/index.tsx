import { Link } from 'react-router-dom';
import { StatusDot, STATUS_LABEL } from '@/shared/components/ui/StatusDot';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

export const SessionCard = ({ session }: { session: Session }) => (
    <Link
        to={`/sessions/${session.id}`}
        className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 transition-colors hover:bg-foreground/[0.03] ${
            session.status === 'waiting_input' ? 'border-warning/40' : 'border-hairline'
        }`}
    >
        <div className='flex items-center gap-2'>
            <StatusDot status={session.status} />
            <span className='truncate text-sm font-medium text-foreground'>{session.title}</span>
        </div>
        <div className='flex items-center justify-between'>
            <span className='font-mono text-[11px] text-muted/70'>{session.cliType}</span>
            <span className='mono-label text-muted/70'>{STATUS_LABEL[session.status]}</span>
        </div>
    </Link>
);
