import { AppShell } from '@/modules/sessions/components/AppShell';
import { CodespaceView } from '@/modules/codespaces/components/CodespaceView';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

// One codespace per project; this route shows the active project's, mirroring how the session
// page shows a session's terminal. AppShell `bleed` gives the iframe the full content area.
const CodespacePage = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);

    return (
        <AppShell bleed>
            {activeProjectId
                ? <CodespaceView key={activeProjectId} projectId={activeProjectId} />
                : <div className='flex h-full items-center justify-center text-sm text-muted'>Select a project to open its codespace.</div>}
        </AppShell>
    );
};

export default CodespacePage;
