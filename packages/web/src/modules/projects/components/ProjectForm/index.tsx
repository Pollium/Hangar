import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { projectApi, cliApi } from '@/modules/projects/api/api';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';

interface Props{
    onCreated: () => void;
}

export const ProjectForm = ({ onCreated }: Props) => {
    const [name, setName] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
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
            await projectApi.create({
                name: name.trim(),
                description: '',
                repoUrl: repoUrl.trim() || undefined,
                defaultCli
            });
            setName('');
            setRepoUrl('');
            onCreated();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3 rounded-xl border border-foreground/10 p-4'>
            <p className='text-sm font-medium text-foreground'>New project</p>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Project name'
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted'
            />
            <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder='Git repo URL (optional)'
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted'
            />
            <select
                value={defaultCli}
                onChange={(e) => setDefaultCli(e.target.value)}
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none'
            >
                {clis.map((cli) => <option key={cli.id} value={cli.id}>{cli.label}</option>)}
            </select>
            <Button onPress={submit} isPending={busy} className='bg-foreground text-background'>Create project</Button>
        </div>
    );
};
