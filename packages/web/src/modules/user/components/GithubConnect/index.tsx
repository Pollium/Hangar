import { useEffect, useState } from 'react';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/modules/auth/store/auth';
import { credentialApi } from '@/modules/settings/api/api';

// Credentials the OAuth callback writes; disconnecting removes exactly this set.
const MANAGED = ['GITHUB_TOKEN', 'GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL'];

/**
 * "Connect GitHub": kicks off the OAuth flow (start endpoint returns the authorize URL, then a
 * top-level navigation) and reflects connected state from the presence of the GITHUB_TOKEN
 * credential. Once connected, sandboxes push to github.com with no further setup.
 */
export const GithubConnect = () => {
    const token = useAuthStore((state) => state.token);
    const [connected, setConnected] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = () => {
        void credentialApi.list()
            .then((creds) => setConnected(creds.some((c) => c.name === 'GITHUB_TOKEN')))
            .catch(() => setConnected(false));
    };
    useEffect(refresh, []);

    const connect = async () => {
        setBusy(true);
        try{
            const res = await fetch(`${env.apiUrl}/auth/github/start`, {
                headers: { Authorization: `Bearer ${token ?? ''}` }
            });
            if(!res.ok) throw new Error('start failed');
            const { url } = await res.json() as { url: string };
            window.location.href = url;
        }catch{
            setBusy(false);
        }
    };

    const disconnect = async () => {
        setBusy(true);
        try{
            const creds = await credentialApi.list();
            await Promise.all(creds.filter((c) => MANAGED.includes(c.name)).map((c) => credentialApi.remove(c.id)));
            refresh();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-1.5'>
            <span className='mono-label text-muted/70'>GitHub</span>
            <div className='flex items-center justify-between rounded-md border border-hairline bg-surface px-3 py-2.5'>
                <span className='flex items-center gap-2.5 text-sm text-foreground'>
                    <svg viewBox='0 0 24 24' className='size-4 shrink-0 text-muted' fill='currentColor' aria-hidden='true'>
                        <path d='M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z' />
                    </svg>
                    {connected === null ? 'Checking…' : connected ? 'Connected — sandboxes can push' : 'Not connected'}
                </span>
                {connected
                    ? (
                        <button
                            type='button'
                            onClick={disconnect}
                            disabled={busy}
                            className='text-xs text-muted transition-colors hover:text-danger disabled:opacity-60'
                        >
                            Disconnect
                        </button>
                    )
                    : (
                        <button
                            type='button'
                            onClick={connect}
                            disabled={busy || !token}
                            className='rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                        >
                            {busy ? 'Redirecting…' : 'Connect GitHub'}
                        </button>
                    )}
            </div>
        </div>
    );
};
