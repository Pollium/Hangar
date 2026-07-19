import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusDot } from '@/shared/components/ui/StatusDot';
import {
    nextSessionSearchIndex,
    type SessionSearchNavigationKey
} from '@/modules/sessions/components/SessionSearch/navigation';
import type { Session } from '@hangar/contracts/modules/session/domain';

interface Props{
    sessions: Session[];
    loading: boolean;
}

export const SessionSearch = ({ sessions, loading }: Props) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const results = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        const matches = normalized
            ? sessions.filter((session) => (
                `${session.title} ${session.cliType} ${session.status}`.toLowerCase().includes(normalized)
            ))
            : sessions;
        return matches.slice(0, 7);
    }, [query, sessions]);
    const selectedIndex = results.length === 0 ? -1 : Math.min(activeIndex, results.length - 1);

    useEffect(() => {
        const focusSearch = (event: KeyboardEvent) => {
            if(!window.matchMedia('(min-width: 768px)').matches) return;
            if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'){
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        window.addEventListener('keydown', focusSearch);
        return () => window.removeEventListener('keydown', focusSearch);
    }, []);

    const select = (sessionId: number) => {
        setOpen(false);
        setQuery('');
        navigate(`/sessions/${sessionId}`);
    };

    return (
        <div
            className='relative w-full'
            onFocus={() => setOpen(true)}
            onBlur={(event) => {
                if(!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <div className={`flex h-9 items-center gap-2 rounded-xl border px-3 shadow-sm backdrop-blur-xl transition-all ${
                open
                    ? 'border-accent/35 bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-2 ring-accent/10'
                    : 'border-hairline bg-foreground/[0.045] hover:bg-foreground/[0.065]'
            }`}>
                <Search className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveIndex(0);
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if(event.key === 'Escape'){
                            setOpen(false);
                            inputRef.current?.blur();
                            return;
                        }
                        if(['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)){
                            event.preventDefault();
                            setOpen(true);
                            setActiveIndex((current) => nextSessionSearchIndex(
                                current,
                                results.length,
                                event.key as SessionSearchNavigationKey
                            ));
                            return;
                        }
                        if(event.key === 'Enter' && selectedIndex >= 0){
                            event.preventDefault();
                            select(results[selectedIndex].id);
                        }
                    }}
                    role='combobox'
                    aria-label='Search sessions'
                    aria-expanded={open}
                    aria-controls='session-search-results'
                    aria-activedescendant={open && selectedIndex >= 0
                        ? `session-search-option-${results[selectedIndex].id}`
                        : undefined}
                    aria-autocomplete='list'
                    placeholder='Search sessions'
                    className='min-w-0 flex-1 bg-transparent text-center text-[13px] text-foreground outline-none placeholder:text-muted/80'
                />
                {query ? (
                    <button
                        type='button'
                        onClick={() => {
                            setQuery('');
                            setActiveIndex(0);
                            inputRef.current?.focus();
                        }}
                        className='grid size-5 shrink-0 place-items-center rounded-full bg-foreground/10 text-muted transition-colors hover:text-foreground'
                        aria-label='Clear session search'
                    >
                        <X className='size-3' aria-hidden='true' />
                    </button>
                ) : (
                    <kbd className='hidden shrink-0 rounded border border-hairline bg-background/60 px-1.5 py-0.5 font-sans text-[9px] text-muted xl:inline'>⌘K</kbd>
                )}
            </div>

            {open && (
                <div
                    id='session-search-results'
                    role='listbox'
                    className='absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-hairline bg-background/95 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl'
                >
                    {loading && sessions.length === 0 && (
                        <p className='px-3 py-2 text-xs text-muted'>Loading sessions…</p>
                    )}
                    {!loading && results.length === 0 && (
                        <p className='px-3 py-2 text-xs text-muted'>No matching sessions.</p>
                    )}
                    {results.map((session, index) => (
                        <button
                            id={`session-search-option-${session.id}`}
                            key={session.id}
                            type='button'
                            role='option'
                            aria-selected={index === selectedIndex}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => select(session.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none ${
                                index === selectedIndex
                                    ? 'bg-foreground/[0.07]'
                                    : 'hover:bg-foreground/[0.05]'
                            }`}
                        >
                            <StatusDot status={session.status} />
                            <span className='min-w-0 flex-1 truncate text-[13px] text-foreground'>{session.title}</span>
                            <span className='shrink-0 text-[10px] text-muted'>{session.cliType}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
