import { useState } from 'react';
import { projectApi } from '@/modules/projects/api/api';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

// The agent CLI is chosen per session, not per project — a project just needs a sane default
// to satisfy the contract, so new sessions start on Claude Code unless the user picks another.
const DEFAULT_CLI = 'claude-code';

export const ProjectForm = ({ onCreated }: { onCreated: (project: Project) => void }) => {
    const [name, setName] = useState('');
    const [repoUrls, setRepoUrls] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if(!name.trim()) return;
        setBusy(true);
        try{
            const urls = repoUrls.split('\n').map((url) => url.trim()).filter(Boolean);
            const project = await projectApi.create({ name: name.trim(), description: '', repoUrls: urls, defaultCli: DEFAULT_CLI });
            setName('');
            setRepoUrls('');
            onCreated(project);
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3'>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder='Project name' />
            <textarea
                className={`${input} min-h-16 resize-y`}
                value={repoUrls}
                onChange={(e) => setRepoUrls(e.target.value)}
                placeholder='Git repo URLs (optional, one per line)'
            />
            <button
                type='button'
                onClick={submit}
                disabled={busy}
                className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
            >
                {busy ? 'Creating…' : 'Create project'}
            </button>
        </div>
    );
};
