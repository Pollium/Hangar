import { create } from 'zustand';

interface CloneRepoModalState{
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useCloneRepoModalStore = create<CloneRepoModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false })
}));
