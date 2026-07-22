import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { ScrollShadow } from '@heroui/react';
import { ChevronRight, ChevronDown, Folder, File as FileIcon, FolderGit2, RefreshCw, LoaderCircle } from 'lucide-react';
import { sandboxApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useCloneRepoModalStore } from '@/modules/projects/store/cloneRepoModal';
import { useFileExplorerStore } from '@/modules/sessions/store/fileExplorer';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import type { FileEntry } from '@hangar/contracts/modules/sandbox/domain';

const WORKSPACE = '/workspace';
const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';

export const FileExplorer = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const refreshToken = useFileExplorerStore((state) => state.refreshToken);
    const openClone = useCloneRepoModalStore((state) => state.open);
    const openCodespaceAt = useWorkspaceStore((state) => state.openCodespaceAt);

    const [childrenByPath, setChildrenByPath] = useState<Record<string, FileEntry[]>>({});
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
    const [rootState, setRootState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    const mark = (setter: Dispatch<SetStateAction<Set<string>>>, path: string, on: boolean) =>
        setter((prev) => {
            const next = new Set(prev);
            if(on) next.add(path); else next.delete(path);
            return next;
        });

    const load = useCallback(async (projectId: number, path: string): Promise<boolean> => {
        mark(setLoadingPaths, path, true);
        try{
            const entries = await sandboxApi.files(projectId, path);
            setChildrenByPath((prev) => ({ ...prev, [path]: entries }));
            return true;
        }catch{
            return false;
        }finally{
            mark(setLoadingPaths, path, false);
        }
    }, []);

    // Reset and (re)load the root whenever the project changes or a clone requests a refresh.
    useEffect(() => {
        if(activeProjectId === null){ setRootState('idle'); return; }
        let cancelled = false;
        setChildrenByPath({});
        setExpanded(new Set());
        setRootState('loading');
        load(activeProjectId, WORKSPACE).then((ok) => {
            if(!cancelled) setRootState(ok ? 'ready' : 'error');
        });
        return () => { cancelled = true; };
    }, [activeProjectId, refreshToken, load]);

    const toggle = (entry: FileEntry) => {
        const isOpen = expanded.has(entry.path);
        mark(setExpanded, entry.path, !isOpen);
        if(!isOpen && activeProjectId !== null && !childrenByPath[entry.path]){
            void load(activeProjectId, entry.path);
        }
    };

    const renderEntries = (entries: FileEntry[], depth: number): ReactNode => entries.map((entry) => {
        const isDir = entry.type === 'dir';
        const isOpen = expanded.has(entry.path);
        const loading = loadingPaths.has(entry.path);
        const kids = childrenByPath[entry.path];
        return (
            <div key={entry.path}>
                <button
                    type='button'
                    onClick={() => isDir ? toggle(entry) : (activeProjectId !== null && openCodespaceAt(activeProjectId, entry.path))}
                    title={entry.name}
                    className='flex w-full min-w-0 items-center gap-1 rounded px-1 py-1 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04]'
                    style={{ paddingLeft: `${depth * 12 + 4}px` }}
                >
                    <span className='grid size-4 shrink-0 place-items-center text-muted'>
                        {isDir
                            ? (loading
                                ? <LoaderCircle className='size-3 animate-spin' aria-hidden='true' />
                                : isOpen ? <ChevronDown className='size-3.5' aria-hidden='true' /> : <ChevronRight className='size-3.5' aria-hidden='true' />)
                            : null}
                    </span>
                    {isDir
                        ? <Folder className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                        : <FileIcon className='size-3.5 shrink-0 text-muted' aria-hidden='true' />}
                    <span className='truncate'>{entry.name}</span>
                </button>
                {isDir && isOpen && kids && kids.length > 0 && renderEntries(kids, depth + 1)}
                {isDir && isOpen && kids && kids.length === 0 && (
                    <p className='py-0.5 text-[11px] text-muted/60' style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>empty</p>
                )}
            </div>
        );
    });

    const roots = childrenByPath[WORKSPACE] ?? [];

    return (
        <div className='flex min-h-0 flex-1 flex-col border-t border-hairline'>
            <div className='flex items-center justify-between px-4 pt-4 pb-1.5'>
                <span className='mono-label text-muted'>Explorer</span>
                <span className='flex items-center gap-0.5'>
                    <button type='button' onClick={openClone} className={iconBtn} aria-label='Clone repository' title='Clone repository'>
                        <FolderGit2 className='size-3.5' aria-hidden='true' />
                    </button>
                    <button
                        type='button'
                        onClick={() => useFileExplorerStore.getState().requestRefresh()}
                        disabled={activeProjectId === null || rootState === 'loading'}
                        className={iconBtn}
                        aria-label='Refresh files'
                        title='Refresh files'
                    >
                        <RefreshCw className={`size-3.5 ${rootState === 'loading' ? 'animate-spin' : ''}`} aria-hidden='true' />
                    </button>
                </span>
            </div>

            <ScrollShadow className='min-h-0 flex-1 px-2 pb-2'>
                {activeProjectId === null ? (
                    <p className='px-2 text-xs text-muted'>Select a project.</p>
                ) : rootState === 'loading' && roots.length === 0 ? (
                    <div className='flex items-center gap-2 px-2 py-2 text-xs text-muted'>
                        <LoaderCircle className='size-4 animate-spin' aria-hidden='true' /> Loading…
                    </div>
                ) : rootState === 'error' ? (
                    <p className='px-2 text-xs text-muted'>Workspace unavailable. Is an agent connected?</p>
                ) : roots.length === 0 ? (
                    <p className='px-2 text-xs text-muted'>No files. Clone a repository to get started.</p>
                ) : (
                    renderEntries(roots, 0)
                )}
            </ScrollShadow>
        </div>
    );
};
