import { create } from 'zustand';

/**
 * Lets out-of-tree actions ask the sidebar file explorer to reload without a direct ref.
 * - `refreshToken`: hard refresh — resets and reloads the tree from the root (used after clone,
 *   create, rename, delete, where structure changed and collapsing is acceptable).
 * - `softToken`: soft refresh — re-fetches already-expanded directories in place, preserving what
 *   the user has open (used by the visible-panel poller so external changes appear unobtrusively).
 */
interface FileExplorerState{
    refreshToken: number;
    softToken: number;
    requestRefresh: () => void;
    requestSoftRefresh: () => void;
}

export const useFileExplorerStore = create<FileExplorerState>((set) => ({
    refreshToken: 0,
    softToken: 0,
    requestRefresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
    requestSoftRefresh: () => set((state) => ({ softToken: state.softToken + 1 }))
}));
