import { useCallback, useEffect, useState } from 'react';
import { ScrollShadow } from '@heroui/react';
import { GitBranch as GitBranchIcon, GitCommit as GitCommitIcon, Check, RefreshCw, LoaderCircle } from 'lucide-react';
import { sandboxApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useFileExplorerStore } from '@/modules/sessions/store/fileExplorer';
import { SidebarSection } from '@/modules/sessions/components/SidebarSection';
import type { GitInfo } from '@hangar/contracts/modules/sandbox/domain';

const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';
type Tab = 'branches' | 'commits';

// A short, human-friendly relative date ("3d", "2mo") from an ISO commit date.
const relativeDate = (iso: string): string => {
    const then = new Date(iso).getTime();
    if(Number.isNaN(then)) return '';
    const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
    const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for(const [size, label] of units){
        if(secs >= size) return `${Math.floor(secs / size)}${label}`;
    }
    return `${secs}s`;
};

// Source Control panel, mirroring the file Explorer: lists the workspace's git repos and, for the
// selected one, its branches and recent commits (read-only). Shares the explorer's refresh token so
// a clone refreshes this panel too. Collapsible so it can sit beneath the Explorer without crowding.
export const SourceControl = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const refreshToken = useFileExplorerStore((state) => state.refreshToken);

    const [info, setInfo] = useState<GitInfo | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);
    const [tab, setTab] = useState<Tab>('commits');
    const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    const load = useCallback(async (projectId: number, repo?: string): Promise<void> => {
        setState('loading');
        try{
            const next = await sandboxApi.git(projectId, repo);
            setInfo(next);
            setSelectedRepo(next.selected?.slug);
            setState('ready');
        }catch{
            setState('error');
        }
    }, []);

    // Reload when the project changes, a clone requests a refresh, or the user picks another repo.
    useEffect(() => {
        if(activeProjectId === null){ setState('idle'); setInfo(null); return; }
        void load(activeProjectId, selectedRepo);
        // selectedRepo intentionally omitted: repo changes go through selectRepo (which calls load).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId, refreshToken, load]);

    const selectRepo = (repo: string) => {
        setSelectedRepo(repo);
        if(activeProjectId !== null) void load(activeProjectId, repo);
    };

    const selected = info?.selected ?? null;
    const branches = selected?.branches ?? [];
    const commits = selected?.commits ?? [];

    return (
        <SidebarSection
            panel='sourceControl'
            title='Source Control'
            actions={
                <button
                    type='button'
                    onClick={() => activeProjectId !== null && void load(activeProjectId, selectedRepo)}
                    disabled={activeProjectId === null || state === 'loading'}
                    className={iconBtn}
                    aria-label='Refresh source control'
                    title='Refresh source control'
                >
                    <RefreshCw className={`size-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden='true' />
                </button>
            }
        >
            <div className='flex min-h-0 flex-1 flex-col'>
                    {activeProjectId === null ? (
                        <p className='px-4 pb-3 text-xs text-muted'>Select a project.</p>
                    ) : state === 'loading' && !info ? (
                        <div className='flex items-center gap-2 px-4 pb-3 text-xs text-muted'>
                            <LoaderCircle className='size-4 animate-spin' aria-hidden='true' /> Loading…
                        </div>
                    ) : state === 'error' ? (
                        <p className='px-4 pb-3 text-xs text-muted'>Source control unavailable. Is an agent connected?</p>
                    ) : !selected ? (
                        <p className='px-4 pb-3 text-xs text-muted'>No git repositories in the workspace.</p>
                    ) : (
                        <>
                            {/* Repo selector — only when the workspace holds more than one repo. */}
                            {info && info.repos.length > 1 && (
                                <div className='px-3 pb-2'>
                                    <select
                                        value={selectedRepo}
                                        onChange={(event) => selectRepo(event.target.value)}
                                        className='w-full rounded-md border border-hairline bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-accent'
                                        aria-label='Repository'
                                    >
                                        {info.repos.map((repo) => <option key={repo} value={repo}>{repo}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Current branch line. */}
                            <div className='flex items-center gap-1.5 px-4 pb-2 text-[13px] text-foreground'>
                                <GitBranchIcon className='size-3.5 shrink-0 text-accent' aria-hidden='true' />
                                <span className='truncate' title={selected.branch ?? 'detached HEAD'}>{selected.branch ?? 'detached HEAD'}</span>
                            </div>

                            {/* Tabs. */}
                            <div className='flex gap-1 px-3 pb-1.5'>
                                {(['commits', 'branches'] as Tab[]).map((key) => (
                                    <button
                                        key={key}
                                        type='button'
                                        onClick={() => setTab(key)}
                                        className={`rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                                            tab === key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
                                        }`}
                                    >
                                        {key === 'commits' ? `Commits${commits.length ? ` (${commits.length})` : ''}` : `Branches${branches.length ? ` (${branches.length})` : ''}`}
                                    </button>
                                ))}
                            </div>

                            <ScrollShadow className='min-h-0 flex-1 px-2 pb-2'>
                                {tab === 'commits' ? (
                                    commits.length === 0 ? (
                                        <p className='px-2 py-1 text-[11px] text-muted/70'>No commits yet.</p>
                                    ) : commits.map((commit) => (
                                        <div key={commit.hash} className='flex min-w-0 items-start gap-1.5 rounded px-2 py-1 hover:bg-foreground/[0.04]'>
                                            <GitCommitIcon className='mt-0.5 size-3.5 shrink-0 text-muted' aria-hidden='true' />
                                            <span className='flex min-w-0 flex-1 flex-col'>
                                                <span className='truncate text-[13px] text-foreground' title={commit.subject}>{commit.subject}</span>
                                                <span className='flex items-center gap-1.5 text-[11px] text-muted/70'>
                                                    <code className='text-muted'>{commit.hash}</code>
                                                    <span className='truncate'>{commit.author}</span>
                                                    <span className='shrink-0'>· {relativeDate(commit.date)}</span>
                                                </span>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    branches.length === 0 ? (
                                        <p className='px-2 py-1 text-[11px] text-muted/70'>No branches.</p>
                                    ) : branches.map((branch) => (
                                        <div
                                            key={`${branch.remote ? 'r' : 'l'}:${branch.name}`}
                                            className='flex min-w-0 items-center gap-1.5 rounded px-2 py-1 text-[13px] hover:bg-foreground/[0.04]'
                                            title={branch.name}
                                        >
                                            <span className='grid size-3.5 shrink-0 place-items-center'>
                                                {branch.current
                                                    ? <Check className='size-3.5 text-accent' aria-hidden='true' />
                                                    : <GitBranchIcon className='size-3.5 text-muted' aria-hidden='true' />}
                                            </span>
                                            <span className={`truncate ${branch.current ? 'font-medium text-accent' : 'text-foreground'}`}>{branch.name}</span>
                                            {branch.remote && <span className='shrink-0 text-[10px] text-muted/60'>remote</span>}
                                        </div>
                                    ))
                                )}
                            </ScrollShadow>
                        </>
                    )}
            </div>
        </SidebarSection>
    );
};
