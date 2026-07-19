import { create } from 'zustand';

interface NewSessionModalState{
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useNewSessionModalStore = create<NewSessionModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false })
}));
