import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { ScrollShadow } from '@heroui/react';
import { ChevronRight, ChevronDown, Folder, File as FileIcon, FolderGit2, RefreshCw, LoaderCircle, SquareArrowOutUpRight, Pencil, Trash2, FilePlus, FolderPlus, Search } from 'lucide-react';
import { sandboxApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useCloneRepoModalStore } from '@/modules/projects/store/cloneRepoModal';
import { useFileExplorerStore } from '@/modules/sessions/store/fileExplorer';
import { useFileSearchStore } from '@/modules/sessions/store/fileSearch';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import { SidebarSection } from '@/modules/sessions/components/SidebarSection';
import { PromptModal } from '@/shared/components/PromptModal';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import { toast } from '@/shared/store/toast';
import type { FileEntry } from '@hangar/contracts/modules/sandbox/domain';

const WORKSPACE = '/workspace';
const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';

// Parent directory of an absolute path (its containing folder). Falls back to /workspace.
const parentDir = (path: string): string => {
    const cut = path.lastIndexOf('/');
    const parent = cut > 0 ? path.slice(0, cut) : WORKSPACE;
    return parent.startsWith(WORKSPACE) ? parent : WORKSPACE;
};

const errText = (err: unknown, fallback: string): string => err instanceof Error ? err.message : fallback;

interface Menu{ entry: FileEntry; x: number; y: number; }
// A pending create: which directory to create in, and whether a file or folder.
interface CreateTarget{ dir: string; type: 'file' | 'dir'; }

export const FileExplorer = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const refreshToken = useFileExplorerStore((state) => state.refreshToken);
    const softToken = useFileExplorerStore((state) => state.softToken);
    const openClone = useCloneRepoModalStore((state) => state.open);
    const openSearch = useFileSearchStore((state) => state.open);
    const openCodespaceAt = useWorkspaceStore((state) => state.openCodespaceAt);

    const [childrenByPath, setChildrenByPath] = useState<Record<string, FileEntry[]>>({});
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
    const [rootState, setRootState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [menu, setMenu] = useState<Menu | null>(null);
    const [renaming, setRenaming] = useState<FileEntry | null>(null);
    const [deleting, setDeleting] = useState<FileEntry | null>(null);
    const [creating, setCreating] = useState<CreateTarget | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Soft refresh (poller): re-fetch the root and every expanded directory in place, without
    // collapsing the tree, so externally-made changes surface unobtrusively.
    useEffect(() => {
        if(softToken === 0 || activeProjectId === null) return;
        void load(activeProjectId, WORKSPACE);
        for(const path of expanded) void load(activeProjectId, path);
        // `expanded` intentionally omitted: we snapshot it when the poll fires, not on every toggle.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [softToken, activeProjectId, load]);

    // Dismiss the context menu on any outside click, scroll, or Escape.
    useEffect(() => {
        if(!menu) return;
        const dismiss = (event: MouseEvent) => {
            if(!menuRef.current?.contains(event.target as Node)) setMenu(null);
        };
        const onKey = (event: KeyboardEvent) => { if(event.key === 'Escape') setMenu(null); };
        window.addEventListener('mousedown', dismiss);
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('mousedown', dismiss); window.removeEventListener('keydown', onKey); };
    }, [menu]);

    const toggle = (entry: FileEntry) => {
        const isOpen = expanded.has(entry.path);
        mark(setExpanded, entry.path, !isOpen);
        if(!isOpen && activeProjectId !== null && !childrenByPath[entry.path]){
            void load(activeProjectId, entry.path);
        }
    };

    // Clicking a file opens its parent directory in the codespace; a folder opens itself.
    const openInCodespace = (entry: FileEntry) => {
        if(activeProjectId === null) return;
        openCodespaceAt(activeProjectId, entry.type === 'dir' ? entry.path : parentDir(entry.path));
    };

    // --- mutations (modal-driven; each returns an error string to keep its modal open) ---

    const submitRename = async (nextName: string): Promise<string | null> => {
        if(activeProjectId === null || !renaming) return 'No project selected.';
        if(nextName.includes('/')) return 'Name cannot contain "/".';
        if(nextName === renaming.name) return null;
        try{
            await sandboxApi.renameFile(activeProjectId, { path: renaming.path, to: `${parentDir(renaming.path)}/${nextName}` });
            useFileExplorerStore.getState().requestRefresh();
            toast.success(`Renamed to ${nextName}`);
            return null;
        }catch(err){
            return errText(err, 'Rename failed.');
        }
    };

    const submitDelete = async (): Promise<string | null> => {
        if(activeProjectId === null || !deleting) return 'No project selected.';
        try{
            await sandboxApi.deleteFile(activeProjectId, { path: deleting.path });
            useFileExplorerStore.getState().requestRefresh();
            toast.success(`Deleted ${deleting.name}`);
            return null;
        }catch(err){
            return errText(err, 'Delete failed.');
        }
    };

    const submitCreate = async (name: string): Promise<string | null> => {
        if(activeProjectId === null || !creating) return 'No project selected.';
        if(name.includes('/')) return 'Name cannot contain "/".';
        try{
            await sandboxApi.createFile(activeProjectId, { path: `${creating.dir}/${name}`, type: creating.type });
            useFileExplorerStore.getState().requestRefresh();
            toast.success(`Created ${name}`);
            return null;
        }catch(err){
            return errText(err, 'Create failed.');
        }
    };

    const openMenu = (event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        setMenu({ entry, x: event.clientX, y: event.clientY });
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
                    onClick={() => isDir ? toggle(entry) : openInCodespace(entry)}
                    onContextMenu={(event) => openMenu(event, entry)}
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
    const menuDir = menu ? (menu.entry.type === 'dir' ? menu.entry.path : parentDir(menu.entry.path)) : WORKSPACE;

    return (
        <>
            <SidebarSection
                panel='explorer'
                title='Explorer'
                actions={
                    <>
                        <button
                            type='button'
                            onClick={openSearch}
                            disabled={activeProjectId === null}
                            className={iconBtn}
                            aria-label='Find file'
                            title='Find file (⌘P)'
                        >
                            <Search className='size-3.5' aria-hidden='true' />
                        </button>
                        <button
                            type='button'
                            onClick={() => setCreating({ dir: WORKSPACE, type: 'file' })}
                            disabled={activeProjectId === null}
                            className={iconBtn}
                            aria-label='New file'
                            title='New file'
                        >
                            <FilePlus className='size-3.5' aria-hidden='true' />
                        </button>
                        <button
                            type='button'
                            onClick={() => setCreating({ dir: WORKSPACE, type: 'dir' })}
                            disabled={activeProjectId === null}
                            className={iconBtn}
                            aria-label='New folder'
                            title='New folder'
                        >
                            <FolderPlus className='size-3.5' aria-hidden='true' />
                        </button>
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
                    </>
                }
            >
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
            </SidebarSection>

            {menu && (
                <div
                    ref={menuRef}
                    role='menu'
                    className='fixed z-50 min-w-48 overflow-hidden rounded-md border border-hairline bg-surface py-1 shadow-lg'
                    style={{ top: menu.y, left: menu.x }}
                >
                    <button
                        type='button'
                        role='menuitem'
                        onClick={() => { const e = menu.entry; setMenu(null); openInCodespace(e); }}
                        className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.06]'
                    >
                        <SquareArrowOutUpRight className='size-3.5 text-muted' aria-hidden='true' /> Open in Codespace
                    </button>
                    <button
                        type='button'
                        role='menuitem'
                        onClick={() => { setMenu(null); setCreating({ dir: menuDir, type: 'file' }); }}
                        className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.06]'
                    >
                        <FilePlus className='size-3.5 text-muted' aria-hidden='true' /> New File
                    </button>
                    <button
                        type='button'
                        role='menuitem'
                        onClick={() => { setMenu(null); setCreating({ dir: menuDir, type: 'dir' }); }}
                        className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.06]'
                    >
                        <FolderPlus className='size-3.5 text-muted' aria-hidden='true' /> New Folder
                    </button>
                    <div className='my-1 border-t border-hairline' />
                    <button
                        type='button'
                        role='menuitem'
                        onClick={() => { const e = menu.entry; setMenu(null); setRenaming(e); }}
                        className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.06]'
                    >
                        <Pencil className='size-3.5 text-muted' aria-hidden='true' /> Rename
                    </button>
                    <button
                        type='button'
                        role='menuitem'
                        onClick={() => { const e = menu.entry; setMenu(null); setDeleting(e); }}
                        className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-danger transition-colors hover:bg-danger/[0.08]'
                    >
                        <Trash2 className='size-3.5' aria-hidden='true' /> Delete
                    </button>
                </div>
            )}

            <PromptModal
                isOpen={renaming !== null}
                title='Rename'
                label='New name'
                initialValue={renaming?.name ?? ''}
                confirmLabel='Rename'
                onSubmit={submitRename}
                onClose={() => setRenaming(null)}
            />

            <PromptModal
                isOpen={creating !== null}
                title={creating?.type === 'dir' ? 'New folder' : 'New file'}
                label={creating?.type === 'dir' ? 'Folder name' : 'File name'}
                placeholder={creating?.type === 'dir' ? 'components' : 'index.ts'}
                confirmLabel='Create'
                onSubmit={submitCreate}
                onClose={() => setCreating(null)}
            />

            <ConfirmModal
                isOpen={deleting !== null}
                title='Delete'
                message={`Delete "${deleting?.name}"? This cannot be undone.`}
                confirmLabel='Delete'
                danger
                onConfirm={submitDelete}
                onClose={() => setDeleting(null)}
            />
        </>
    );
};
