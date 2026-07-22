import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@heroui/react';
import { Plus, Server, Check, Copy, Trash2, LoaderCircle } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { agentApi } from '@/modules/agents/api/api';
import type { Agent, CreatedAgent } from '@hangar/contracts/modules/agent/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';
const primaryBtn = 'inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60';

// Relative "last seen" label from an ISO timestamp; em dash when never connected.
const lastSeen = (value: string | null): string => {
    if(!value) return '—';
    const elapsed = Math.max(0, Date.now() - Date.parse(value));
    const minutes = Math.floor(elapsed / 60_000);
    if(minutes < 1) return 'just now';
    if(minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if(hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const AgentsPage = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [created, setCreated] = useState<CreatedAgent | null>(null);
    const [copied, setCopied] = useState(false);

    const refresh = useCallback(async () => { setAgents(await agentApi.list()); }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    // Poll so online/offline stays live and a just-connected agent is detected without a refresh.
    useEffect(() => {
        const timer = setInterval(() => { void refresh(); }, 4000);
        return () => clearInterval(timer);
    }, [refresh]);

    const createdOnline = created !== null && agents.some((agent) => agent.id === created.agent.id && agent.status === 'online');

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

    const remove = async (id: number) => {
        // Drop it from the list immediately; resync from the server only if the delete fails.
        setAgents((current) => current.filter((agent) => agent.id !== id));
        try{
            await agentApi.remove(id);
        }catch{
            void refresh();
        }
    };

    return (
        <AppShell>
            <Canvas>
                <Row>
                    <PageHeader
                        title='Compute'
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
                        <div className='overflow-hidden rounded-xl border border-hairline'>
                            <table className='w-full border-collapse text-sm'>
                                <thead>
                                    <tr className='border-b border-hairline bg-foreground/[0.02] text-left'>
                                        <th scope='col' className='px-4 py-2.5 font-medium text-muted'>Name</th>
                                        <th scope='col' className='px-4 py-2.5 font-medium text-muted'>Status</th>
                                        <th scope='col' className='hidden px-4 py-2.5 font-medium text-muted sm:table-cell'>Last seen</th>
                                        <th scope='col' className='w-12 px-4 py-2.5'><span className='sr-only'>Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent) => (
                                        <tr key={agent.id} className='border-b border-hairline transition-colors last:border-b-0 hover:bg-foreground/[0.02]'>
                                            <td className='px-4 py-2.5'>
                                                <div className='flex min-w-0 items-center gap-2.5'>
                                                    <Server className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                                                    <span className='min-w-0 truncate font-medium text-foreground'>{agent.name}</span>
                                                </div>
                                            </td>
                                            <td className='px-4 py-2.5'>
                                                <span className='flex items-center gap-1.5 text-xs text-muted'>
                                                    <span className={`size-1.5 rounded-full ${agent.status === 'online' ? 'bg-success' : 'bg-foreground/25'}`} aria-hidden='true' />
                                                    {agent.status === 'online' ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td className='hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted sm:table-cell'>{lastSeen(agent.lastSeenAt)}</td>
                                            <td className='px-4 py-2.5 text-right'>
                                                <button
                                                    type='button'
                                                    onClick={() => remove(agent.id)}
                                                    aria-label={`Remove ${agent.name}`}
                                                    className='grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:text-danger'
                                                >
                                                    <Trash2 className='size-4' aria-hidden='true' />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                        <div className='flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-xs'>
                                            {createdOnline ? (
                                                <>
                                                    <span className='size-1.5 rounded-full bg-success' aria-hidden='true' />
                                                    <span className='font-medium text-success'>Connected — your VPS is online.</span>
                                                </>
                                            ) : (
                                                <>
                                                    <LoaderCircle className='size-3.5 animate-spin text-muted' aria-hidden='true' />
                                                    <span className='text-muted'>Waiting for connection… run the command on your VPS.</span>
                                                </>
                                            )}
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
