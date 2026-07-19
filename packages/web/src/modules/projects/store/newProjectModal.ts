import { create } from 'zustand';

interface NewProjectModalState{
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useNewProjectModalStore = create<NewProjectModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false })
}));
