import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { TerminalView } from '@/modules/sessions/components/Terminal';
import { CliSwitcher } from '@/modules/sessions/components/CliSwitcher';

const SessionPage = () => {
    const { id } = useParams();
    const sessionId = Number(id);

    return (
        <AppShell
            title={`Session #${sessionId}`}
            bleed
            headerActions={(
                <>
                    <CliSwitcher sessionId={sessionId} />
                    <Link
                        to='/'
                        className='inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline px-2.5 text-xs text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground'
                    >
                        <ArrowLeft className='size-3.5' aria-hidden='true' />
                        <span className='hidden sm:inline'>Overview</span>
                    </Link>
                </>
            )}
        >
            {Number.isInteger(sessionId)
                ? <TerminalView key={sessionId} sessionId={sessionId} />
                : <div className='flex h-full items-center justify-center text-sm text-muted'>Invalid session.</div>}
        </AppShell>
    );
};

export default SessionPage;
