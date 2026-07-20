import { create } from 'zustand';

interface SidebarState{
    collapsed: boolean;
    toggle: () => void;
    setCollapsed: (value: boolean) => void;
}

/** Desktop sidebar collapse state, shared across routes so it survives navigation. */
export const useSidebarStore = create<SidebarState>((set) => ({
    collapsed: false,
    toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    setCollapsed: (value) => set({ collapsed: value })
}));
