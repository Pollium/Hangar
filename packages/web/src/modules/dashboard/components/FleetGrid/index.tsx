import { useMemo } from 'react';
import { SessionCard } from '@/modules/dashboard/components/SessionCard';
import type { Session, SessionStatus } from '@cloud-code/contracts/modules/session/domain';

// Sessions needing a human come first, then running, then the rest.
const PRIORITY: Record<SessionStatus, number> = {
    waiting_input: 0,
    running: 1,
    starting: 2,
    idle: 3,
    error: 4,
    stopped: 5
};

export const FleetGrid = ({ sessions }: { sessions: Session[] }) => {
    const ordered = useMemo(
        () => [...sessions].sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status]),
        [sessions]
    );

    if(sessions.length === 0){
        return <p className='text-sm text-muted'>No sessions running.</p>;
    }

    return (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {ordered.map((session) => <SessionCard key={session.id} session={session} />)}
        </div>
    );
};
