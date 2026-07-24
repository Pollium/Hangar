import { create } from 'zustand';

const STORAGE_KEY = 'hangar.sidebarWidth';
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
/** Matches the previous fixed `md:w-60` (15rem = 240px). */
const DEFAULT_WIDTH = 240;

const clampWidth = (value: number): number => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));

const readStoredWidth = (): number => {
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw === null) return DEFAULT_WIDTH;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? clampWidth(parsed) : DEFAULT_WIDTH;
    }catch{
        return DEFAULT_WIDTH;
    }
};

interface SidebarState{
    collapsed: boolean;
    /** Desktop sidebar width in px when expanded. Clamped to [200, 480]. */
    width: number;
    toggle: () => void;
    setCollapsed: (value: boolean) => void;
    setWidth: (value: number) => void;
}

/** Desktop sidebar collapse + width state, shared across routes so it survives navigation. */
export const useSidebarStore = create<SidebarState>((set) => ({
    collapsed: false,
    width: readStoredWidth(),
    toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    setCollapsed: (value) => set({ collapsed: value }),
    setWidth: (value) => {
        const width = clampWidth(value);
        try{
            localStorage.setItem(STORAGE_KEY, String(width));
        }catch{
            // Ignore quota/availability errors — sidebar width is a nicety, not critical state.
        }
        set({ width });
    }
}));
