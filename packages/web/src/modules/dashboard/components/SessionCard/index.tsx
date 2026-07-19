import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderGit2, LoaderCircle, Trash2 } from 'lucide-react';
import { sessionApi } from '@/modules/sessions/api/api';
import { SESSION_STATUS_LABEL, SESSION_STATUS_TEXT } from '@/shared/utils/sessionStatus';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

const CLI_LABEL: Record<string, string> = {
    'claude-code': 'Claude Code',
    codex: 'Codex',
    opencode: 'OpenCode',
    gemini: 'Gemini CLI'
};

const timeAgo = (value: string | null, now: number): string => {
    if(!value) return 'No activity yet';
    const elapsed = Math.max(0, now - Date.parse(value));
    const minutes = Math.floor(elapsed / 60_000);
    if(minutes < 1) return 'Updated just now';
    if(minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if(hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Updated ${days}d ago`;
};

interface Props{
    session: Session;
    projectName?: string;
    now: number;
}

export const SessionCard = ({ session, projectName, now }: Props) => {
    const [deleting, setDeleting] = useState(false);

    const remove = async (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const confirmed = window.confirm(
            `Delete “${session.title}”? The running CLI process and its session history will be removed.`
        );
        if(!confirmed) return;

        setDeleting(true);
        try{
            await sessionApi.remove(session.id);
        }catch{
            window.alert('The session could not be deleted. Please try again.');
            setDeleting(false);
        }
    };

    return (
        <Link
            to={`/sessions/${session.id}`}
            className='group relative flex min-w-0 items-center gap-4 border-b border-hairline py-4 pr-9 transition-colors hover:border-foreground/25'
            aria-label={`${session.title}, ${SESSION_STATUS_LABEL[session.status]}`}
        >
            <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 items-center gap-2'>
                    <h3 className={`truncate text-sm font-medium transition-colors ${SESSION_STATUS_TEXT[session.status]}`}>
                        {session.title}
                    </h3>
                    <ArrowUpRight className='size-3.5 shrink-0 text-muted/50 transition-colors group-hover:text-foreground' aria-hidden='true' />
                </div>
                <div className='mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted'>
                    <FolderGit2 className='size-3 shrink-0' aria-hidden='true' />
                    <span className='truncate'>{projectName ?? `Project #${session.projectId}`}</span>
                    <span aria-hidden='true'>·</span>
                    <span>{CLI_LABEL[session.cliType] ?? session.cliType}</span>
                    <span aria-hidden='true'>·</span>
                    <span className='font-mono'>#{session.id}</span>
                </div>
            </div>
            <div className='flex shrink-0 flex-col items-end gap-1 text-right'>
                <span className={`text-[11px] font-medium ${SESSION_STATUS_TEXT[session.status]}`}>
                    {SESSION_STATUS_LABEL[session.status]}
                </span>
                <span className='text-[11px] text-muted'>{timeAgo(session.lastActiveAt, now)}</span>
            </div>
            <button
                type='button'
                onClick={remove}
                disabled={deleting}
                className='absolute top-1/2 right-0 grid size-7 -translate-y-1/2 place-items-center rounded text-muted opacity-0 transition-all hover:text-danger focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60'
                aria-label={`Delete ${session.title}`}
                title={`Delete ${session.title}`}
            >
                {deleting
                    ? <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' />
                    : <Trash2 className='size-3.5' aria-hidden='true' />}
            </button>
        </Link>
    );
};
