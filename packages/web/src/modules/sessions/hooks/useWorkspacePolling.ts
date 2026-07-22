import { useEffect } from 'react';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useFileExplorerStore } from '@/modules/sessions/store/fileExplorer';

const POLL_MS = 8000;

/**
 * Polls a soft refresh of the workspace panels (Explorer + Source Control) while the tab is visible
 * and a project is selected, so changes made outside the UI (in the terminal or codespace) surface
 * without a manual refresh. Soft refresh preserves expanded state. Pauses when the tab is hidden.
 *
 * Note: this is a pragmatic poll, not push. There's no server-side workspace file-watcher channel
 * yet; adding one (a gateway emitting workspace.changed over the agent tunnel) would replace this.
 */
export const useWorkspacePolling = (): void => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const requestSoftRefresh = useFileExplorerStore((state) => state.requestSoftRefresh);

    useEffect(() => {
        if(activeProjectId === null) return;
        let timer: ReturnType<typeof setInterval> | null = null;

        const start = () => {
            if(timer !== null) return;
            timer = setInterval(() => {
                if(document.visibilityState === 'visible') requestSoftRefresh();
            }, POLL_MS);
        };
        const stop = () => { if(timer !== null){ clearInterval(timer); timer = null; } };

        start();
        const onVisibility = () => {
            if(document.visibilityState === 'visible') start(); else stop();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
    }, [activeProjectId, requestSoftRefresh]);
};
