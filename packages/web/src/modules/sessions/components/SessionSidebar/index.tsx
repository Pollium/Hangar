import { useParams } from 'react-router-dom';
import { SessionItem } from '@/modules/sessions/components/SessionItem';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

interface Props{
    sessions: Session[];
    loading: boolean;
}

export const SessionSidebar = ({ sessions, loading }: Props) => {
    const params = useParams();
    const activeId = params.id ? Number(params.id) : null;

    return (
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pb-2'>
            {loading && sessions.length === 0 && (
                <p className='px-4 py-2 text-xs text-muted'>Loading…</p>
            )}
            {!loading && sessions.length === 0 && (
                <p className='px-4 py-2 text-xs text-muted'>No sessions yet.</p>
            )}
            {sessions.map((session) => (
                <SessionItem key={session.id} session={session} active={session.id === activeId} />
            ))}
        </div>
    );
};
