import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@heroui/react';
import { Plus, Server, Check, Copy, Trash2 } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { agentApi } from '@/modules/agents/api/api';
import type { Agent, CreatedAgent } from '@hangar/contracts/modules/agent/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';
const primaryBtn = 'inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60';

const AgentsPage = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState<CreatedAgent | null>(null);
    const [copied, setCopied] = useState(false);

    const refresh = useCallback(async () => { setAgents(await agentApi.list()); }, []);
    useEffect(() => { void refresh(); }, [refresh]);

    const submit = async () => {
        if(!name.trim()) return;
        setBusy(true);
        try{
            setCreated(await agentApi.create({ name: name.trim() }));
            setName('');
            void refresh();
        }finally{
            setBusy(false);
        }
    };

    const close = () => { setOpen(false); setCreated(null); setName(''); setCopied(false); };

    const copy = async () => {
        if(!created) return;
        await navigator.clipboard.writeText(created.installCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const remove = async (id: number) => { await agentApi.remove(id); void refresh(); };

    return (
        <AppShell>
            <Canvas>
                <Row>
                    <PageHeader
                        title='Compute'
                        description='Your sessions and codespaces run on your own machines. Connect a VPS by running one command on it — the agent dials out, so no inbound ports are needed.'
                        actions={(
                            <button type='button' onClick={() => setOpen(true)} className={primaryBtn}>
                                <Plus className='size-3.5' aria-hidden='true' />
                                Connect a VPS
                            </button>
                        )}
                    />
                </Row>
                <Row grow className='mt-2'>
                    {agents.length === 0 ? (
                        <EmptyState
                            icon={Server}
                            title='No compute connected'
                            description='Connect a VPS to run projects. Without one, sessions and codespaces cannot start.'
                        />
                    ) : (
                        <ul className='flex flex-col gap-3'>
                            {agents.map((agent) => (
                                <li key={agent.id} className='flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-4 py-3'>
                                    <div className='flex min-w-0 items-center gap-3'>
                                        <span className='grid size-9 shrink-0 place-items-center rounded-full border border-hairline text-muted' aria-hidden='true'>
                                            <Server className='size-4' />
                                        </span>
                                        <div className='flex min-w-0 flex-col'>
                                            <span className='truncate text-sm font-medium text-foreground'>{agent.name}</span>
                                            <span className='flex items-center gap-1.5 text-xs text-muted'>
                                                <span className={`size-1.5 rounded-full ${agent.status === 'online' ? 'bg-success' : 'bg-foreground/25'}`} aria-hidden='true' />
                                                {agent.status === 'online' ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() => remove(agent.id)}
                                        aria-label={`Remove ${agent.name}`}
                                        className='grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-danger'
                                    >
                                        <Trash2 className='size-4' aria-hidden='true' />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Row>
            </Canvas>

            <Modal.Root isOpen={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.Header>
                                <Modal.Heading>{created ? 'Run this on your VPS' : 'Connect a VPS'}</Modal.Heading>
                                <Modal.CloseTrigger />
                            </Modal.Header>
                            <Modal.Body>
                                {created ? (
                                    <div className='flex flex-col gap-3'>
                                        <p className='text-sm text-muted'>Requires Docker. The token is shown only once — it authenticates this machine.</p>
                                        <div className='flex items-start gap-2 rounded-md border border-hairline bg-surface-secondary p-3'>
                                            <code className='min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground'>{created.installCommand}</code>
                                            <button type='button' onClick={copy} aria-label='Copy command' className='shrink-0 rounded-md border border-hairline p-1.5 text-muted transition-colors hover:text-foreground'>
                                                {copied ? <Check className='size-3.5 text-success' /> : <Copy className='size-3.5' />}
                                            </button>
                                        </div>
                                        <button type='button' onClick={close} className={`${primaryBtn} self-start`}>Done</button>
                                    </div>
                                ) : (
                                    <div className='flex flex-col gap-3'>
                                        <label className='flex flex-col gap-1.5'>
                                            <span className='mono-label text-muted/70'>Name</span>
                                            <input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder='e.g. hetzner-fra1' autoFocus />
                                        </label>
                                        <button type='button' onClick={submit} disabled={busy || !name.trim()} className={`${primaryBtn} self-start`}>
                                            {busy ? 'Creating…' : 'Create token'}
                                        </button>
                                    </div>
                                )}
                            </Modal.Body>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal.Root>
        </AppShell>
    );
};

export default AgentsPage;
