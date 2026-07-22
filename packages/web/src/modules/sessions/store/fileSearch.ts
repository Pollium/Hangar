import { create } from 'zustand';

interface FileSearchState{
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

/** Open state for the workspace file finder (Cmd/Ctrl+P), a command-palette-style fuzzy search. */
export const useFileSearchStore = create<FileSearchState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen }))
}));
