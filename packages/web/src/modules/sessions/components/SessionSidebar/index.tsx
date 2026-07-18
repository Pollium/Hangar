import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useSessions } from '@/modules/sessions/hooks/useSessions';
import { SessionItem } from '@/modules/sessions/components/SessionItem';

export const SessionSidebar = () => {
    const { sessions, loading } = useSessions();
    const [query, setQuery] = useState('');
    const params = useParams();
    const navigate = useNavigate();
    const activeId = params.id ? Number(params.id) : null;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if(!q) return sessions;
        return sessions.filter((s) => `${s.title} ${s.cliType}`.toLowerCase().includes(q));
    }, [sessions, query]);

    return (
        <aside className='flex w-64 shrink-0 flex-col gap-3 px-3 pb-3 pt-4'>
            <div className='flex items-center gap-2'>
                <div className='flex flex-1 items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-1.5'>
                    <Search className='size-3.5 text-muted' />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='Search sessions...'
                        className='w-full bg-transparent text-[0.8125rem] text-foreground outline-none placeholder:text-muted'
                    />
                </div>
                <button
                    type='button'
                    onClick={() => navigate('/sessions/new')}
                    className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted transition-colors hover:text-foreground'
                    aria-label='New session'
                >
                    <Plus className='size-4' />
                </button>
            </div>

            <nav className='flex flex-1 flex-col gap-0.5 overflow-y-auto'>
                {loading && sessions.length === 0
                    ? <p className='px-2.5 py-2 text-xs text-muted'>Loading…</p>
                    : filtered.map((session) => (
                        <SessionItem key={session.id} session={session} active={session.id === activeId} />
                    ))}
                {!loading && sessions.length === 0 && (
                    <p className='px-2.5 py-2 text-xs text-muted'>No sessions yet.</p>
                )}
            </nav>
        </aside>
    );
};
