import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal, ScrollShadow } from '@heroui/react';
import { Lock, LoaderCircle, Download } from 'lucide-react';
import { sandboxApi, githubApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useCloneRepoModalStore } from '@/modules/projects/store/cloneRepoModal';
import type { GithubRepo } from '@hangar/contracts/modules/github/domain';

const textInput = 'flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

export const CloneRepoModal = () => {
    const navigate = useNavigate();
    const isOpen = useCloneRepoModalStore((state) => state.isOpen);
    const close = useCloneRepoModalStore((state) => state.close);
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);

    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [url, setUrl] = useState('');
    const [busyUrl, setBusyUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(!isOpen) return;
        setLoadingRepos(true);
        setError(null);
        githubApi.repos()
            .then(setRepos)
            .catch(() => setRepos([]))
            .finally(() => setLoadingRepos(false));
    }, [isOpen]);

    const handleOpenChange = (open: boolean) => {
        if(open) return;
        close();
        setUrl('');
        setError(null);
        setBusyUrl(null);
    };

    const runClone = async (target: string) => {
        const trimmed = target.trim();
        if(!trimmed || activeProjectId === null) return;
        setBusyUrl(trimmed);
        setError(null);
        try{
            await sandboxApi.clone(activeProjectId, { url: trimmed });
            handleOpenChange(false);
            // Land the user in the codespace so the freshly-cloned repo is visible — code-server
            // watches /workspace live, so the new directory appears without an explicit refresh.
            navigate('/codespace');
        }catch(err){
            setError(err instanceof Error ? err.message : 'Clone failed.');
        }finally{
            setBusyUrl(null);
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>Clone repository</Modal.Heading>
                            <Modal.CloseTrigger />
                        </Modal.Header>
                        <Modal.Body>
                            <div className='flex flex-col gap-4'>
                                <label className='flex flex-col gap-1.5'>
                                    <span className='mono-label text-muted/70'>Repository URL</span>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            className={textInput}
                                            value={url}
                                            onChange={(event) => setUrl(event.target.value)}
                                            onKeyDown={(event) => { if(event.key === 'Enter') void runClone(url); }}
                                            placeholder='https://github.com/org/repo.git'
                                        />
                                        <button
                                            type='button'
                                            onClick={() => void runClone(url)}
                                            disabled={!url.trim() || busyUrl !== null}
                                            className='shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                                        >
                                            {busyUrl === url.trim() ? 'Cloning…' : 'Clone'}
                                        </button>
                                    </div>
                                </label>

                                <div className='flex flex-col gap-1.5'>
                                    <span className='mono-label text-muted/70'>Your GitHub repositories</span>
                                    {loadingRepos ? (
                                        <div className='flex items-center gap-2 py-3 text-xs text-muted'>
                                            <LoaderCircle className='size-4 animate-spin' aria-hidden='true' /> Loading…
                                        </div>
                                    ) : repos.length === 0 ? (
                                        <p className='py-2 text-xs text-muted'>
                                            No repositories. Connect GitHub in{' '}
                                            <Link to='/settings' onClick={() => handleOpenChange(false)} className='text-accent hover:underline'>Environment</Link>.
                                        </p>
                                    ) : (
                                        <ScrollShadow className='max-h-64 rounded-md border border-hairline'>
                                            {repos.map((repo) => (
                                                <button
                                                    key={repo.fullName}
                                                    type='button'
                                                    onClick={() => void runClone(repo.cloneUrl)}
                                                    disabled={busyUrl !== null}
                                                    className='flex w-full min-w-0 items-center gap-2 border-b border-hairline px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-foreground/[0.04] disabled:opacity-60'
                                                >
                                                    <span className='flex min-w-0 flex-col'>
                                                        <span className='flex min-w-0 items-center gap-1.5'>
                                                            {repo.private && <Lock className='size-3 shrink-0 text-muted' aria-hidden='true' />}
                                                            <span className='truncate text-[13px] text-foreground'>{repo.fullName}</span>
                                                        </span>
                                                        {repo.description && <span className='truncate text-[11px] text-muted/70'>{repo.description}</span>}
                                                    </span>
                                                    <span className='min-w-0 flex-1' />
                                                    {busyUrl === repo.cloneUrl
                                                        ? <LoaderCircle className='size-3.5 shrink-0 animate-spin text-muted' aria-hidden='true' />
                                                        : <Download className='size-3.5 shrink-0 text-muted' aria-hidden='true' />}
                                                </button>
                                            ))}
                                        </ScrollShadow>
                                    )}
                                </div>

                                {error && <p role='alert' className='text-xs text-danger'>{error}</p>}
                                {activeProjectId === null && <p className='text-xs text-muted'>Select a project first.</p>}
                            </div>
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal.Root>
    );
};
