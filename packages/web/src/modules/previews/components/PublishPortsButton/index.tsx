import { useState } from 'react';
import { Globe, Copy, Check, ExternalLink, Trash2, LoaderCircle } from 'lucide-react';
import { previewApi } from '@/modules/previews/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { ApiError } from '@/shared/services/ApiError';
import type { PublishedAppView } from '@hangar/contracts/modules/preview/domain';

export const PublishPortsButton = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const [open, setOpen] = useState(false);
    const [apps, setApps] = useState<PublishedAppView[]>([]);
    const [port, setPort] = useState('');
    const [label, setLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    if(activeProjectId === null) return null;

    const load = async () => {
        try{
            setApps(await previewApi.list(activeProjectId));
        }catch{
            setApps([]);
        }
    };

    const toggle = () => {
        const next = !open;
        setOpen(next);
        setError(null);
        if(next) void load();
    };

    const publish = async () => {
        const value = Number(port);
        if(!Number.isInteger(value) || value < 1 || value > 65535){ setError('Enter a port between 1 and 65535.'); return; }
        setBusy(true);
        setError(null);
        try{
            const app = await previewApi.publish(activeProjectId, { port: value, label: label.trim() || undefined });
            setApps((current) => [...current, app]);
            setPort('');
            setLabel('');
        }catch(err){
            setError(err instanceof ApiError ? err.message : 'Could not publish the port.');
        }finally{
            setBusy(false);
        }
    };

    const unpublish = async (slug: string) => {
        setApps((current) => current.filter((app) => app.slug !== slug));
        try{
            await previewApi.unpublish(slug);
        }catch{
            void load();
        }
    };

    const copy = (url: string) => {
        void navigator.clipboard?.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied((current) => current === url ? null : current), 1500);
    };

    return (
        <div className='relative'>
            <button
                type='button'
                onClick={toggle}
                className='grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                aria-label='Publish ports'
                title='Publish ports'
            >
                <Globe className='size-4' aria-hidden='true' />
            </button>

            {open && (
                <div className='absolute right-0 z-20 mt-2 w-96 rounded-xl border border-hairline bg-surface p-4 shadow-xl'>
                    <p className='mb-1 text-sm font-medium text-foreground'>Publish a port</p>
                    <p className='mb-3 text-xs text-muted'>Expose a port from this project&apos;s container at a public URL.</p>

                    <div className='flex items-end gap-2'>
                        <label className='flex flex-col gap-1'>
                            <span className='mono-label text-muted'>Port</span>
                            <input
                                type='number'
                                value={port}
                                onChange={(event) => setPort(event.target.value)}
                                onKeyDown={(event) => { if(event.key === 'Enter') void publish(); }}
                                placeholder='3000'
                                className='w-20 rounded-md border border-hairline bg-transparent px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-accent/50'
                            />
                        </label>
                        <label className='flex min-w-0 flex-1 flex-col gap-1'>
                            <span className='mono-label text-muted'>Label (optional)</span>
                            <input
                                type='text'
                                value={label}
                                onChange={(event) => setLabel(event.target.value)}
                                onKeyDown={(event) => { if(event.key === 'Enter') void publish(); }}
                                placeholder='web'
                                className='w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-accent/50'
                            />
                        </label>
                        <button
                            type='button'
                            onClick={() => void publish()}
                            disabled={busy}
                            className='rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60'
                        >
                            {busy ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' /> : 'Publish'}
                        </button>
                    </div>
                    {error && <p className='mt-2 text-xs text-danger'>{error}</p>}

                    <div className='mt-4 flex flex-col gap-1'>
                        {apps.length === 0
                            ? <p className='text-xs text-muted'>No ports published.</p>
                            : apps.map((app) => (
                                <div key={app.slug} className='group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-foreground/[0.04]'>
                                    <span className='flex min-w-0 flex-1 flex-col'>
                                        <span className='truncate text-[13px] text-foreground'>{app.label ?? `Port ${app.port}`}</span>
                                        <span className='truncate text-[11px] text-muted/70'>{app.url}</span>
                                    </span>
                                    <button type='button' onClick={() => copy(app.url)} className='grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent' aria-label='Copy URL' title='Copy URL'>
                                        {copied === app.url ? <Check className='size-3.5' aria-hidden='true' /> : <Copy className='size-3.5' aria-hidden='true' />}
                                    </button>
                                    <a href={app.url} target='_blank' rel='noreferrer' className='grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent' aria-label='Open' title='Open'>
                                        <ExternalLink className='size-3.5' aria-hidden='true' />
                                    </a>
                                    <button type='button' onClick={() => void unpublish(app.slug)} className='grid size-6 place-items-center rounded text-muted transition-colors hover:text-danger' aria-label='Unpublish' title='Unpublish'>
                                        <Trash2 className='size-3.5' aria-hidden='true' />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
