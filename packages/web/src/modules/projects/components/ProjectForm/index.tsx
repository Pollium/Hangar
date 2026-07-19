import { useState, useEffect } from 'react';
import { ListBox, ListBoxItem, Select } from '@heroui/react';
import { projectApi, cliApi } from '@/modules/projects/api/api';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';
const selectTrigger = 'flex h-[38px] items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-accent data-[open]:border-accent';

export const ProjectForm = ({ onCreated }: { onCreated: (project: Project) => void }) => {
    const [name, setName] = useState('');
    const [repoUrls, setRepoUrls] = useState('');
    const [defaultCli, setDefaultCli] = useState('claude-code');
    const [clis, setClis] = useState<CliDescriptor[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void cliApi.list().then(setClis).catch(() => setClis([]));
    }, []);

    const submit = async () => {
        if(!name.trim()) return;
        setBusy(true);
        try{
            const urls = repoUrls.split('\n').map((url) => url.trim()).filter(Boolean);
            const project = await projectApi.create({ name: name.trim(), description: '', repoUrls: urls, defaultCli });
            setName('');
            setRepoUrls('');
            onCreated(project);
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder='Project name' />
                <Select.Root selectedKey={defaultCli} onSelectionChange={(key) => setDefaultCli(String(key))}>
                    <Select.Trigger className={selectTrigger}>
                        <Select.Value />
                        <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                        <ListBox>
                            {clis.map((cli) => (
                                <ListBoxItem key={cli.id} id={cli.id}>{cli.label}</ListBoxItem>
                            ))}
                        </ListBox>
                    </Select.Popover>
                </Select.Root>
            </div>
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
