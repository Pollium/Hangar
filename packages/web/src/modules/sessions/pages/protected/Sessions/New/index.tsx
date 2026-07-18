import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { sessionApi } from '@/modules/sessions/api/api';
import { projectApi, cliApi } from '@/modules/projects/api/api';
import type { Project } from '@cloud-code/contracts/modules/project/domain';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

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
        <AppShell title='New session'>
            <Canvas>
                <Row className='px-8 pt-12 pb-10'>
                    <PageHeader title='New session' description='Pick a project and a CLI. The agent starts in a persistent tmux session inside the sandbox.' />
                </Row>
                <Row grow className='p-8'>
                    {projects.length === 0 ? (
                        <div className='flex flex-col items-start gap-3 rounded-xl border border-hairline p-6'>
                            <p className='text-sm text-muted'>You need a project first.</p>
                            <button onClick={() => navigate('/projects')} className='rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover'>
                                Create a project
                            </button>
                        </div>
                    ) : (
                        <div className='flex max-w-md flex-col gap-4'>
                            <label className='flex flex-col gap-1.5'>
                                <span className='mono-label text-muted/70'>Project</span>
                                <select className={input} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
                                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </label>
                            <label className='flex flex-col gap-1.5'>
                                <span className='mono-label text-muted/70'>CLI</span>
                                <select className={input} value={cliType} onChange={(e) => setCliType(e.target.value)}>
                                    {clis.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </label>
                            <label className='flex flex-col gap-1.5'>
                                <span className='mono-label text-muted/70'>Title</span>
                                <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder='What are you working on?' />
                            </label>
                            <button
                                onClick={create}
                                disabled={busy}
                                className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                            >
                                {busy ? 'Starting…' : 'Start session'}
                            </button>
                        </div>
                    )}
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default NewSession;
