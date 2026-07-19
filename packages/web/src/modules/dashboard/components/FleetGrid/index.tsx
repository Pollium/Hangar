import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, LoaderCircle, Plus, Radar } from 'lucide-react';
import { SessionCard } from '@/modules/dashboard/components/SessionCard';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';
import type { Session, SessionStatus } from '@cloud-code/contracts/modules/session/domain';

const PRIORITY: Record<SessionStatus, number> = {
    waiting_input: 0,
    error: 1,
    running: 2,
    starting: 3,
    idle: 4,
    stopped: 5
};

const GROUPS: Array<{
    id: string;
    title: string;
    description: string;
    statuses: SessionStatus[];
}> = [
    {
        id: 'attention',
        title: 'Needs attention',
        description: 'Waiting for input or requiring recovery.',
        statuses: ['waiting_input', 'error']
    },
    {
        id: 'active',
        title: 'In progress',
        description: 'Agents currently starting or working.',
        statuses: ['running', 'starting']
    },
    {
        id: 'idle',
        title: 'Idle',
        description: 'Ready to continue when you are.',
        statuses: ['idle']
    },
    {
        id: 'history',
        title: 'Stopped',
        description: 'Sessions that are no longer running.',
        statuses: ['stopped']
    }
];

interface Props{
    sessions: Session[];
    loading: boolean;
    error: string | null;
}

export const FleetGrid = ({ sessions, loading, error }: Props) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const ordered = useMemo(
        () => [...sessions].sort((left, right) => {
            const priority = PRIORITY[left.status] - PRIORITY[right.status];
            if(priority !== 0) return priority;
            return Date.parse(right.lastActiveAt ?? right.createdAt) - Date.parse(left.lastActiveAt ?? left.createdAt);
        }),
        [sessions]
    );

    if(error && sessions.length === 0){
        return (
            <div role='alert' className='flex min-h-72 flex-col items-center justify-center gap-4 border-y border-danger/30 px-6 text-center'>
                <CircleAlert className='size-5 text-danger' aria-hidden='true' />
                <div className='flex flex-col gap-1'>
                    <h2 className='text-sm font-medium text-foreground'>Fleet could not be loaded</h2>
                    <p className='max-w-sm text-xs leading-5 text-muted'>The live connection will retry automatically. Check the API if this continues.</p>
                </div>
            </div>
        );
    }

    if(loading && sessions.length === 0){
        return (
            <div role='status' aria-live='polite' className='flex min-h-72 flex-col items-center justify-center gap-3 text-center'>
                <LoaderCircle className='size-5 animate-spin text-accent' aria-hidden='true' />
                <div className='flex flex-col gap-1'>
                    <h2 className='text-sm font-medium text-foreground'>Loading your fleet</h2>
                    <p className='text-xs text-muted'>Connecting to live session updates…</p>
                </div>
            </div>
        );
    }

    if(sessions.length === 0){
        return (
            <EmptyState
                icon={Radar}
                title='Your fleet is empty'
                description='Start an agent session and it will appear here with live status updates.'
                action={(
                    <button
                        type='button'
                        onClick={() => useNewSessionModalStore.getState().open()}
                        className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover'
                    >
                        <Plus className='size-3.5' aria-hidden='true' />
                        New session
                    </button>
                )}
            />
        );
    }

    return (
        <div className='flex flex-col gap-9' aria-busy={loading}>
            {loading && <span className='sr-only' role='status'>Refreshing fleet data</span>}
            {GROUPS.map((group) => {
                const grouped = ordered.filter((session) => group.statuses.includes(session.status));
                if(grouped.length === 0) return null;
                const headingId = `fleet-group-${group.id}`;
                return (
                    <section key={group.id} aria-labelledby={headingId} className='flex flex-col gap-3'>
                        <div className='flex items-end justify-between gap-4'>
                            <div className='flex flex-col gap-0.5'>
                                <h2 id={headingId} className='text-sm font-semibold text-foreground'>{group.title}</h2>
                                <p className='text-xs text-muted'>{group.description}</p>
                            </div>
                            <span className='mono-label text-muted' aria-label={`${grouped.length} sessions`}>{grouped.length}</span>
                        </div>
                        <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
                            {grouped.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    now={now}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
