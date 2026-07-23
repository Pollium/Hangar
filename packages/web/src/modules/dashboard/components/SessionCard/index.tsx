import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, Trash2 } from 'lucide-react';
import { sessionApi } from '@/modules/sessions/api/api';
import { SESSION_STATUS_LABEL, SESSION_STATUS_TEXT } from '@/shared/utils/sessionStatus';
import { relativeTime } from '@/shared/utils/time';
import type { Session, SessionStatus } from '@hangar/contracts/modules/session/domain';

const CLI_LABEL: Record<string, string> = {
    'claude-code': 'Claude Code',
    codex: 'Codex',
    opencode: 'OpenCode',
    gemini: 'Gemini CLI'
};

// Status dot color; `pulse` marks live/attention states worth animating.
const STATUS_DOT: Record<SessionStatus, string> = {
    starting: 'bg-warning',
    running: 'bg-success',
    waiting_input: 'bg-warning',
    idle: 'bg-foreground/30',
    stopped: 'bg-foreground/20',
    error: 'bg-danger'
};
const PULSE: Record<SessionStatus, boolean> = {
    starting: true, running: true, waiting_input: true, idle: false, stopped: false, error: false
};

interface Props{
    session: Session;
    now: number;
}

export const SessionCard = ({ session, now }: Props) => {
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
            className='group relative flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 pr-9 transition-colors hover:bg-foreground/[0.03]'
            aria-label={`${session.title}, ${SESSION_STATUS_LABEL[session.status]}`}
        >
            <span className='relative grid size-4 shrink-0 place-items-center' aria-hidden='true'>
                <span className={`size-2 rounded-full ${STATUS_DOT[session.status]}`} />
                {PULSE[session.status] && <span className={`absolute size-2 animate-ping rounded-full ${STATUS_DOT[session.status]} opacity-60`} />}
            </span>

            <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 items-center gap-1.5'>
                    <h3 className='truncate text-sm font-medium text-foreground'>{session.title}</h3>
                    <ArrowUpRight className='size-3.5 shrink-0 text-muted/40 transition-colors group-hover:text-foreground' aria-hidden='true' />
                </div>
                <div className='mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted'>
                    <span>{CLI_LABEL[session.cliType] ?? session.cliType}</span>
                    <span aria-hidden='true'>·</span>
                    <span className='tabular-nums'>#{session.id}</span>
                </div>
            </div>

            <div className='flex shrink-0 flex-col items-end gap-0.5 text-right'>
                <span className={`text-[11px] font-medium ${SESSION_STATUS_TEXT[session.status]}`}>
                    {SESSION_STATUS_LABEL[session.status]}
                </span>
                <span className='text-[11px] text-muted/80'>{relativeTime(session.lastActiveAt, 'No activity yet', now)}</span>
            </div>

            <button
                type='button'
                onClick={remove}
                disabled={deleting}
                className='absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60'
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
