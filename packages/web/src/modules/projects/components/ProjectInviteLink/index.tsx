import { useState } from 'react';
import { Check, Copy, RotateCw } from 'lucide-react';
import { projectApi } from '@/modules/projects/api/api';

const input = 'flex-1 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none';

export const ProjectInviteLink = ({ projectId, inviteToken, onRotated }: {
    projectId: number;
    inviteToken: string;
    onRotated: () => void;
}) => {
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const link = `${window.location.origin}/invites/${inviteToken}`;

    const copy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const rotate = async () => {
        setBusy(true);
        try{
            await projectApi.rotateInvite(projectId);
            onRotated();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-1.5'>
            <span className='mono-label text-muted/70'>Invite link</span>
            <div className='flex items-center gap-2'>
                <input className={input} value={link} readOnly onFocus={(event) => event.target.select()} />
                <button
                    type='button'
                    onClick={copy}
                    aria-label='Copy invite link'
                    className='grid size-7 shrink-0 place-items-center rounded-md border border-hairline text-muted transition-colors hover:text-foreground'
                >
                    {copied ? <Check className='size-3.5 text-success' aria-hidden='true' /> : <Copy className='size-3.5' aria-hidden='true' />}
                </button>
                <button
                    type='button'
                    onClick={rotate}
                    disabled={busy}
                    aria-label='Regenerate invite link'
                    className='grid size-7 shrink-0 place-items-center rounded-md border border-hairline text-muted transition-colors hover:text-foreground disabled:opacity-60'
                >
                    <RotateCw className='size-3.5' aria-hidden='true' />
                </button>
            </div>
        </div>
    );
};
