import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { sessionApi } from '@/modules/sessions/api/api';
import { SESSION_STATUS_LABEL, SESSION_STATUS_TEXT } from '@/shared/utils/sessionStatus';
import type { Session } from '@hangar/contracts/modules/session/domain';

interface Props{
    session: Session;
    active: boolean;
}

export const SessionItem = ({ session, active }: Props) => {
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);

    const remove = async () => {
        const confirmed = window.confirm(
            `Delete “${session.title}”? The running CLI process and its session history will be removed.`
        );
        if(!confirmed) return;

        setDeleting(true);
        try{
            await sessionApi.remove(session.id);
            // No local removal: the fleet.remove realtime event updates the shared list.
            if(active) navigate('/');
        }catch{
            window.alert('The session could not be deleted. Please try again.');
            setDeleting(false);
        }
    };

    return (
        <div className='group relative mx-2 transition-colors'>
            <Link
                to={`/sessions/${session.id}`}
                className='flex min-w-0 items-center px-2 py-2 pr-9 transition-colors hover:bg-foreground/[0.025]'
                aria-label={`${session.title}, ${SESSION_STATUS_LABEL[session.status]}`}
            >
                <span className='flex min-w-0 flex-1 flex-col'>
                    <span className={`truncate text-[13px] transition-colors ${
                        active ? 'font-medium' : ''
                    } ${SESSION_STATUS_TEXT[session.status]}`}>
                        {session.title}
                    </span>
                    <span className='truncate text-[11px] text-muted/70'>{session.cliType}</span>
                </span>
            </Link>
            <button
                type='button'
                onClick={() => void remove()}
                disabled={deleting}
                className='absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded text-muted opacity-0 transition-all hover:text-danger focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60'
                aria-label={`Delete ${session.title}`}
                title={`Delete ${session.title}`}
            >
                {deleting
                    ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' />
                    : <Trash2 className='size-3.5' aria-hidden='true' />}
            </button>
        </div>
    );
};
