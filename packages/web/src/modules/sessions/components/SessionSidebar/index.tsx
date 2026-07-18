import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { SessionItem } from '@/modules/sessions/components/SessionItem';

export const SessionSidebar = () => {
    const { sessions, loading } = useSessions();
    const [query, setQuery] = useState('');
    const params = useParams();
    const activeId = params.id ? Number(params.id) : null;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if(!q) return sessions;
        return sessions.filter((s) => `${s.title} ${s.cliType}`.toLowerCase().includes(q));
    }, [sessions, query]);

    return (
        <div className='flex min-h-0 flex-1 flex-col'>
            <div className='mx-2 mb-1 flex items-center gap-2 rounded-md bg-foreground/[0.04] px-2 py-1.5'>
                <Search className='size-3.5 text-muted' />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search sessions…'
                    className='w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted'
                />
            </div>

            <div className='flex min-h-0 flex-1 flex-col overflow-y-auto pb-2'>
                {loading && sessions.length === 0 && (
                    <p className='px-4 py-2 text-xs text-muted'>Loading…</p>
                )}
                {!loading && sessions.length === 0 && (
                    <p className='px-4 py-2 text-xs text-muted'>No sessions yet.</p>
                )}
                {filtered.map((session) => (
                    <SessionItem key={session.id} session={session} active={session.id === activeId} />
                ))}
            </div>
        </div>
    );
};
