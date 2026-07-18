import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { sessionApi } from '@/modules/sessions/api/api';
import { projectApi, cliApi } from '@/modules/projects/api/api';
import type { Project } from '@cloud-code/contracts/modules/project/domain';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';

const NewSession = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clis, setClis] = useState<CliDescriptor[]>([]);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [cliType, setCliType] = useState('claude-code');
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void projectApi.list().then((list) => {
            setProjects(list);
            if(list.length) setProjectId(list[0].id);
        });
        void cliApi.list().then(setClis);
    }, []);

    const create = async () => {
        if(!projectId) return;
        setBusy(true);
        try{
            const session = await sessionApi.create({ projectId, cliType, title: title.trim() || undefined });
            navigate(`/sessions/${session.id}`);
        }finally{
            setBusy(false);
        }
    };

    return (
        <AppShell>
            <div className='mx-auto flex w-full max-w-md flex-col gap-4 p-8'>
                <h1 className='text-lg font-semibold text-foreground'>New session</h1>

                {projects.length === 0 ? (
                    <div className='flex flex-col gap-3 rounded-xl border border-foreground/10 p-4'>
                        <p className='text-sm text-muted'>You need a project first.</p>
                        <Button onPress={() => navigate('/projects')} className='bg-foreground text-background'>Create a project</Button>
                    </div>
                ) : (
                    <>
                        <label className='flex flex-col gap-1 text-sm'>
                            <span className='text-muted'>Project</span>
                            <select
                                value={projectId ?? ''}
                                onChange={(e) => setProjectId(Number(e.target.value))}
                                className='rounded-lg bg-foreground/5 px-3 py-2 text-foreground outline-none'
                            >
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>

                        <label className='flex flex-col gap-1 text-sm'>
                            <span className='text-muted'>CLI</span>
                            <select
                                value={cliType}
                                onChange={(e) => setCliType(e.target.value)}
                                className='rounded-lg bg-foreground/5 px-3 py-2 text-foreground outline-none'
                            >
                                {clis.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </label>

                        <label className='flex flex-col gap-1 text-sm'>
                            <span className='text-muted'>Title (optional)</span>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder='What are you working on?'
                                className='rounded-lg bg-foreground/5 px-3 py-2 text-foreground outline-none placeholder:text-muted'
                            />
                        </label>

                        <Button onPress={create} isPending={busy} className='bg-foreground text-background'>Start session</Button>
                    </>
                )}
            </div>
        </AppShell>
    );
};

export default NewSession;
