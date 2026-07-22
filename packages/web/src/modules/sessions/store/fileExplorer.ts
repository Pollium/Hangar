import { create } from 'zustand';

/**
 * Lets an out-of-tree action (the clone modal) ask the sidebar file explorer to reload without a
 * direct ref: the explorer re-fetches whenever `refreshToken` changes.
 */
interface FileExplorerState{
    refreshToken: number;
    requestRefresh: () => void;
}

export const useFileExplorerStore = create<FileExplorerState>((set) => ({
    refreshToken: 0,
    requestRefresh: () => set((state) => ({ refreshToken: state.refreshToken + 1 }))
}));
