import { useParams } from 'react-router-dom';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { TerminalView } from '@/modules/sessions/components/Terminal';

const SessionPage = () => {
    const { id } = useParams();
    const sessionId = Number(id);

    return (
        <AppShell>
            {Number.isInteger(sessionId)
                ? <TerminalView key={sessionId} sessionId={sessionId} />
                : <div className='flex h-full items-center justify-center text-sm text-muted'>Invalid session.</div>}
        </AppShell>
    );
};

export default SessionPage;
