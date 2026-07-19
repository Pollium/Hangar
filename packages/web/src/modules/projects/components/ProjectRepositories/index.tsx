import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { projectApi } from '@/modules/projects/api/api';
import type { ProjectRepositoryProfile } from '@cloud-code/contracts/modules/project/domain';

const input = 'rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

export const ProjectRepositories = ({ projectId }: { projectId: number }) => {
    const [repos, setRepos] = useState<ProjectRepositoryProfile[]>([]);
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setRepos(await projectApi.listRepositories(projectId));
    }, [projectId]);

    useEffect(() => { void load(); }, [load]);

    const add = async () => {
        const trimmed = url.trim();
        if(!trimmed) return;
        setBusy(true);
        try{
            await projectApi.addRepository(projectId, { url: trimmed });
            setUrl('');
            await load();
        }finally{
            setBusy(false);
        }
    };

    const remove = async (repoId: number) => {
        await projectApi.removeRepository(projectId, repoId);
        await load();
    };

    return (
        <div className='flex flex-col gap-1.5'>
            <span className='mono-label text-muted/70'>Repositories</span>
            {repos.length === 0 && <p className='text-xs text-muted'>No repos attached.</p>}
            {repos.map((repo) => (
                <div key={repo.id} className='flex items-center gap-2'>
                    <span className='min-w-0 flex-1 truncate text-xs text-foreground'>{repo.url}</span>
                    <button
                        type='button'
                        onClick={() => remove(repo.id)}
                        aria-label={`Remove ${repo.url}`}
                        className='text-muted transition-colors hover:text-danger'
                    >
                        <X className='size-3.5' aria-hidden='true' />
                    </button>
                </div>
            ))}
            <div className='flex items-center gap-2'>
                <input
                    className={`${input} flex-1`}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder='https://github.com/org/repo.git'
                />
                <button
                    type='button'
                    onClick={add}
                    disabled={busy}
                    aria-label='Add repository'
                    className='grid size-7 shrink-0 place-items-center rounded-md border border-hairline text-muted transition-colors hover:text-accent disabled:opacity-60'
                >
                    <Plus className='size-3.5' aria-hidden='true' />
                </button>
            </div>
        </div>
    );
};
