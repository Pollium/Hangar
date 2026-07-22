import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { codespaceApi } from '@/modules/codespaces/api/api';

// Mirrors the terminal's session view: a full-bleed, rounded container — but an iframe onto the
// project's in-container code-server instead of an xterm. The API mints a short-lived ticket
// (also booting code-server) which the same-origin proxy swaps for an httpOnly cookie.
// `folderPath` opens code-server at a specific workspace directory (e.g. a clicked file's parent);
// it defaults to /workspace. The parent keys the pane by folderPath so navigating re-mounts here.
export const CodespaceView = ({ projectId, folderPath }: { projectId: number; folderPath?: string }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const folder = folderPath && folderPath.startsWith('/workspace') ? folderPath : '/workspace';

    useEffect(() => {
        let cancelled = false;
        setSrc(null);
        setFailed(false);
        codespaceApi.token(projectId)
            // ?folder loads the workspace directly, skipping code-server's bare-root 302; cc is
            // the one-time ticket the proxy swaps for a cookie then strips from the URL.
            .then((ticket) => { if(!cancelled) setSrc(`${ticket.path}?folder=${encodeURIComponent(folder)}&cc=${encodeURIComponent(ticket.token)}`); })
            .catch(() => { if(!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [projectId, folder, attempt]);

    return (
        <div className='flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#1e1e1e]'>
            {failed ? (
                <div role='alert' className='flex h-full flex-col items-center justify-center gap-3 text-sm text-muted'>
                    Could not start the codespace.
                    <button
                        type='button'
                        onClick={() => setAttempt((n) => n + 1)}
                        className='rounded-md border border-hairline px-3 py-1 font-medium text-foreground transition-colors hover:bg-foreground/[0.05]'
                    >
                        Retry
                    </button>
                </div>
            ) : src ? (
                <iframe title='Codespace' src={src} className='h-full w-full border-0' />
            ) : (
                <div className='flex h-full items-center justify-center text-muted'>
                    <LoaderCircle className='size-5 animate-spin' aria-hidden='true' />
                </div>
            )}
        </div>
    );
};
