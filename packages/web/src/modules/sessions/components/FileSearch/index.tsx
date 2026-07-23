import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, File as FileIcon, CornerDownLeft } from 'lucide-react';
import { sandboxApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useFileSearchStore } from '@/modules/sessions/store/fileSearch';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import { parentDir, workspaceRelative } from '@/shared/utils/workspacePath';
import type { FileEntry } from '@hangar/contracts/modules/sandbox/domain';

/**
 * Command-palette-style workspace file finder (Cmd/Ctrl+P). Debounced server-side search over all
 * repos; arrow keys + Enter to open. Selecting a file opens its parent directory in the codespace
 * (code-server then reveals the file). Cmd+K is taken by SessionSearch, so this binds Cmd+P.
 */
export const FileSearch = () => {
    const isOpen = useFileSearchStore((state) => state.isOpen);
    const open = useFileSearchStore((state) => state.open);
    const close = useFileSearchStore((state) => state.close);
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const openCodespaceAt = useWorkspaceStore((state) => state.openCodespaceAt);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Global Cmd/Ctrl+P to open (desktop only). Prevent the browser's print dialog.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p'){
                if(!window.matchMedia('(min-width: 768px)').matches) return;
                event.preventDefault();
                open();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    // Reset and focus when opened.
    useEffect(() => {
        if(isOpen){
            setQuery('');
            setResults([]);
            setActive(0);
            // Focus after paint.
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    // Debounced search.
    useEffect(() => {
        if(!isOpen || activeProjectId === null) return;
        const q = query.trim();
        if(!q){ setResults([]); setLoading(false); return; }
        setLoading(true);
        let cancelled = false;
        const timer = setTimeout(async () => {
            try{
                const found = await sandboxApi.search(activeProjectId, q);
                if(!cancelled){ setResults(found); setActive(0); }
            }catch{
                if(!cancelled) setResults([]);
            }finally{
                if(!cancelled) setLoading(false);
            }
        }, 180);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query, isOpen, activeProjectId]);

    if(!isOpen) return null;

    const choose = (entry: FileEntry) => {
        if(activeProjectId !== null) openCodespaceAt(activeProjectId, parentDir(entry.path));
        close();
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if(event.key === 'Escape'){ close(); return; }
        if(event.key === 'ArrowDown'){ event.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
        else if(event.key === 'ArrowUp'){ event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        else if(event.key === 'Enter'){ event.preventDefault(); const pick = results[active]; if(pick) choose(pick); }
    };

    return (
        <div className='fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]' role='dialog' aria-modal='true' aria-label='Find file'>
            <button type='button' aria-label='Close' className='absolute inset-0 cursor-default bg-black/40' onClick={close} />
            <div className='relative z-10 flex w-[min(92vw,40rem)] flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-2xl'>
                <div className='flex items-center gap-2 border-b border-hairline px-3'>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder='Search files by name or path…'
                        className='min-w-0 flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted'
                    />
                    {loading && <LoaderCircle className='size-4 shrink-0 animate-spin text-muted' aria-hidden='true' />}
                </div>

                <div className='max-h-[50vh] overflow-y-auto py-1'>
                    {activeProjectId === null ? (
                        <p className='px-4 py-3 text-xs text-muted'>Select a project first.</p>
                    ) : query.trim() && !loading && results.length === 0 ? (
                        <p className='px-4 py-3 text-xs text-muted'>No files match “{query.trim()}”.</p>
                    ) : (
                        results.map((entry, index) => (
                            <button
                                key={entry.path}
                                type='button'
                                onMouseEnter={() => setActive(index)}
                                onClick={() => choose(entry)}
                                className={`flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors ${
                                    index === active ? 'bg-accent/10' : 'hover:bg-foreground/[0.04]'
                                }`}
                            >
                                <FileIcon className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                                <span className='shrink-0 text-[13px] text-foreground'>{entry.name}</span>
                                <span className='min-w-0 flex-1 truncate text-[11px] text-muted/70'>{workspaceRelative(parentDir(entry.path))}</span>
                                {index === active && <CornerDownLeft className='size-3.5 shrink-0 text-muted' aria-hidden='true' />}
                            </button>
                        ))
                    )}
                </div>

                <div className='flex items-center gap-3 border-t border-hairline px-3 py-1.5 text-[10px] text-muted/60'>
                    <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
                </div>
            </div>
        </div>
    );
};
