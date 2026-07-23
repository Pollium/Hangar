import { useCallback, useEffect, useState } from 'react';
import { ScrollShadow } from '@heroui/react';
import { GitBranch as GitBranchIcon, GitCommit as GitCommitIcon, Check, RefreshCw, LoaderCircle, ArrowDown, ArrowUp, DownloadCloud, FileDiff } from 'lucide-react';
import { sandboxApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useFileExplorerStore } from '@/modules/sessions/store/fileExplorer';
import { SidebarSection } from '@/modules/sessions/components/SidebarSection';
import { toast } from '@/shared/store/toast';
import { compactAge } from '@/shared/utils/time';
import { errorMessage } from '@/shared/utils/error';
import { basename } from '@/shared/utils/workspacePath';
import type { GitInfo, GitChange } from '@hangar/contracts/modules/sandbox/domain';

const iconBtn = 'grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent disabled:opacity-50';
type Tab = 'changes' | 'commits' | 'branches';

// Single-letter status badge + color for a porcelain change.
const changeBadge = (change: GitChange): { label: string; cls: string } => {
    if(change.untracked) return { label: 'U', cls: 'text-success' };
    const c = change.code.trim();
    if(c.startsWith('D')) return { label: 'D', cls: 'text-danger' };
    if(c.startsWith('A')) return { label: 'A', cls: 'text-success' };
    if(c.startsWith('R')) return { label: 'R', cls: 'text-accent' };
    return { label: 'M', cls: 'text-warning' };
};

// Source Control panel, mirroring the file Explorer: lists the workspace's git repos and, for the
// selected one, its working-tree changes, branches and recent commits, plus pull/push/fetch and
// branch checkout. Shares the explorer's refresh token so a clone/file change refreshes it too.
export const SourceControl = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const refreshToken = useFileExplorerStore((state) => state.refreshToken);
    const softToken = useFileExplorerStore((state) => state.softToken);
    const requestFilesRefresh = useFileExplorerStore((state) => state.requestRefresh);

    const [info, setInfo] = useState<GitInfo | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);
    const [tab, setTab] = useState<Tab>('changes');
    const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [action, setAction] = useState<string | null>(null);

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

    // Reload when the project changes, a clone/file op requests a refresh, the poller ticks, or the
    // user picks a repo.
    useEffect(() => {
        if(activeProjectId === null){ setState('idle'); setInfo(null); return; }
        void load(activeProjectId, selectedRepo);
        // selectedRepo intentionally omitted: repo changes go through selectRepo (which calls load).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId, refreshToken, softToken, load]);

    const selectRepo = (repo: string) => {
        setSelectedRepo(repo);
        if(activeProjectId !== null) void load(activeProjectId, repo);
    };

    const selected = info?.selected ?? null;
    const branches = selected?.branches ?? [];
    const commits = selected?.commits ?? [];
    const changes = selected?.changes ?? [];

    // Run a git write action, apply its returned GitInfo, and toast the outcome. `label` names the
    // in-flight action (disables the toolbar); `verb` is used in the success/error message.
    const runAction = async (
        label: string,
        verb: string,
        call: (projectId: number, repo: string) => Promise<GitInfo>
    ): Promise<void> => {
        if(activeProjectId === null || !selected) return;
        setAction(label);
        try{
            const next = await call(activeProjectId, selected.slug);
            setInfo(next);
            setSelectedRepo(next.selected?.slug);
            // A checkout/pull can change files on disk — nudge the explorer too.
            requestFilesRefresh();
            toast.success(`${verb} succeeded`);
        }catch(err){
            toast.error(errorMessage(err, `${verb} failed`));
        }finally{
            setAction(null);
        }
    };

    const pull = () => runAction('pull', 'Pull', (p, r) => sandboxApi.gitPull(p, { repo: r }));
    const push = () => runAction('push', 'Push', (p, r) => sandboxApi.gitPush(p, { repo: r }));
    const fetch = () => runAction('fetch', 'Fetch', (p, r) => sandboxApi.gitFetch(p, { repo: r }));
    const checkout = (branch: string) => runAction(`checkout:${branch}`, `Checkout ${branch}`, (p, r) => sandboxApi.gitCheckout(p, { repo: r, branch }));

    const busy = action !== null;

    return (
        <SidebarSection
            panel='sourceControl'
            title='Source'
            actions={
                <>
                    <button
                        type='button'
                        onClick={fetch}
                        disabled={!selected || busy}
                        className={iconBtn}
                        aria-label='Fetch'
                        title='Fetch all remotes'
                    >
                        {action === 'fetch' ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' /> : <DownloadCloud className='size-3.5' aria-hidden='true' />}
                    </button>
                    <button
                        type='button'
                        onClick={pull}
                        disabled={!selected || busy}
                        className={iconBtn}
                        aria-label='Pull'
                        title='Pull'
                    >
                        {action === 'pull' ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' /> : <ArrowDown className='size-3.5' aria-hidden='true' />}
                    </button>
                    <button
                        type='button'
                        onClick={push}
                        disabled={!selected || busy}
                        className={iconBtn}
                        aria-label='Push'
                        title='Push'
                    >
                        {action === 'push' ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' /> : <ArrowUp className='size-3.5' aria-hidden='true' />}
                    </button>
                    <button
                        type='button'
                        onClick={() => activeProjectId !== null && void load(activeProjectId, selectedRepo)}
                        disabled={activeProjectId === null || state === 'loading' || busy}
                        className={iconBtn}
                        aria-label='Refresh source control'
                        title='Refresh'
                    >
                        <RefreshCw className={`size-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden='true' />
                    </button>
                </>
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

                            {/* Current branch + ahead/behind. */}
                            <div className='flex items-center gap-1.5 px-4 pb-2 text-[13px] text-foreground'>
                                <GitBranchIcon className='size-3.5 shrink-0 text-accent' aria-hidden='true' />
                                <span className='truncate' title={selected.branch ?? 'detached HEAD'}>{selected.branch ?? 'detached HEAD'}</span>
                                {(selected.ahead > 0 || selected.behind > 0) && (
                                    <span className='flex shrink-0 items-center gap-1.5 text-[11px] text-muted'>
                                        {selected.behind > 0 && <span className='flex items-center' title={`${selected.behind} behind`}><ArrowDown className='size-3' aria-hidden='true' />{selected.behind}</span>}
                                        {selected.ahead > 0 && <span className='flex items-center' title={`${selected.ahead} ahead`}><ArrowUp className='size-3' aria-hidden='true' />{selected.ahead}</span>}
                                    </span>
                                )}
                                {!selected.upstream && selected.branch && (
                                    <span className='shrink-0 text-[10px] text-muted/60' title='No upstream configured'>no upstream</span>
                                )}
                            </div>

                            {/* Tabs. Only Changes shows a count. */}
                            <div className='flex gap-1 px-3 pb-1.5'>
                                {(['changes', 'commits', 'branches'] as Tab[]).map((key) => (
                                    <button
                                        key={key}
                                        type='button'
                                        onClick={() => setTab(key)}
                                        className={`rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                                            tab === key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
                                        }`}
                                    >
                                        {key === 'changes' && changes.length ? `changes (${changes.length})` : key}
                                    </button>
                                ))}
                            </div>

                            <ScrollShadow className='min-h-0 flex-1 px-2 pb-2'>
                                {tab === 'changes' ? (
                                    changes.length === 0 ? (
                                        <p className='flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted/70'>
                                            <FileDiff className='size-3.5' aria-hidden='true' /> No changes. Working tree clean.
                                        </p>
                                    ) : changes.map((change) => {
                                        const badge = changeBadge(change);
                                        const name = basename(change.path);
                                        return (
                                            <div key={change.path} className='flex min-w-0 items-center gap-1.5 rounded px-2 py-1 text-[13px] hover:bg-foreground/[0.04]' title={change.path}>
                                                <span className={`w-3 shrink-0 text-center text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                                                <span className='truncate text-foreground'>{name}</span>
                                                <span className='min-w-0 flex-1 truncate text-[11px] text-muted/60'>{change.path}</span>
                                            </div>
                                        );
                                    })
                                ) : tab === 'commits' ? (
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
                                                    <span className='shrink-0'>· {compactAge(commit.date)}</span>
                                                </span>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    branches.length === 0 ? (
                                        <p className='px-2 py-1 text-[11px] text-muted/70'>No branches.</p>
                                    ) : branches.map((branch) => (
                                        <button
                                            key={`${branch.remote ? 'r' : 'l'}:${branch.name}`}
                                            type='button'
                                            disabled={busy || branch.current}
                                            onClick={() => checkout(branch.name)}
                                            title={branch.current ? branch.name : `Checkout ${branch.name}`}
                                            className='flex w-full min-w-0 items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors hover:bg-foreground/[0.04] disabled:cursor-default'
                                        >
                                            <span className='grid size-3.5 shrink-0 place-items-center'>
                                                {action === `checkout:${branch.name}`
                                                    ? <LoaderCircle className='size-3.5 animate-spin text-muted' aria-hidden='true' />
                                                    : branch.current
                                                        ? <Check className='size-3.5 text-accent' aria-hidden='true' />
                                                        : <GitBranchIcon className='size-3.5 text-muted' aria-hidden='true' />}
                                            </span>
                                            <span className={`truncate ${branch.current ? 'font-medium text-accent' : 'text-foreground'}`}>{branch.name}</span>
                                            {branch.remote && <span className='shrink-0 text-[10px] text-muted/60'>remote</span>}
                                        </button>
                                    ))
                                )}
                            </ScrollShadow>
                        </>
                    )}
            </div>
        </SidebarSection>
    );
};
