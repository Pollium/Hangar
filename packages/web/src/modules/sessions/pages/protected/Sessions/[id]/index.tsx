import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Workspace } from '@/modules/sessions/components/Workspace';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';

const SessionPage = () => {
    const { id } = useParams();
    const sessionId = Number(id);
    const openContent = useWorkspaceStore((state) => state.openContent);

    // The route no longer owns a single terminal — it seeds the shared workspace, opening this
    // session in the active pane (creating the first pane when the workspace is empty).
    useEffect(() => {
        if(Number.isInteger(sessionId)) openContent({ kind: 'terminal', sessionId });
    }, [sessionId, openContent]);

    return (
        <AppShell bleed>
            {Number.isInteger(sessionId)
                ? <Workspace />
                : <div className='flex h-full items-center justify-center text-sm text-muted'>Invalid session.</div>}
        </AppShell>
    );
};

export default SessionPage;
