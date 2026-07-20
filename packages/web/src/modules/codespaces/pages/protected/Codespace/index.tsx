import { useEffect } from 'react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Workspace } from '@/modules/sessions/components/Workspace';
import { useWorkspaceStore } from '@/modules/sessions/store/workspace';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

// One codespace per project. This route seeds the shared workspace with the active project's
// codespace in the active pane, so it can sit alongside terminals in a split layout.
const CodespacePage = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const openContent = useWorkspaceStore((state) => state.openContent);

    useEffect(() => {
        if(activeProjectId !== null) openContent({ kind: 'codespace', projectId: activeProjectId });
    }, [activeProjectId, openContent]);

    return (
        <AppShell bleed>
            {activeProjectId
                ? <Workspace />
                : <div className='flex h-full items-center justify-center text-sm text-muted'>Select a project to open its codespace.</div>}
        </AppShell>
    );
};

export default CodespacePage;
