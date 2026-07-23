import { create } from 'zustand';

/** Collapsible/resizable sidebar panels. Height is the body height in px when expanded. */
export type SidebarPanel = 'sessions' | 'explorer' | 'sourceControl';

interface PanelState{
    collapsed: boolean;
    height: number;
}

interface SidebarPanelsState{
    sessions: PanelState;
    explorer: PanelState;
    sourceControl: PanelState;
    toggle: (panel: SidebarPanel) => void;
    setHeight: (panel: SidebarPanel, height: number) => void;
}

const STORAGE_KEY = 'hangar.sidebarPanels';
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 800;
const DEFAULTS: Record<SidebarPanel, PanelState> = {
    sessions: { collapsed: false, height: 240 },
    explorer: { collapsed: false, height: 260 },
    sourceControl: { collapsed: false, height: 220 }
};

const clampHeight = (value: number): number => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));

const readPanel = (
    stored: Partial<PanelState> | undefined,
    fallback: PanelState
): PanelState => ({
    collapsed: stored?.collapsed ?? fallback.collapsed,
    height: clampHeight(stored?.height ?? fallback.height)
});

const readStored = (): Record<SidebarPanel, PanelState> => {
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return DEFAULTS;
        const parsed = JSON.parse(raw) as Partial<Record<SidebarPanel, Partial<PanelState>>>;
        return {
            sessions: readPanel(parsed.sessions, DEFAULTS.sessions),
            explorer: readPanel(parsed.explorer, DEFAULTS.explorer),
            sourceControl: readPanel(parsed.sourceControl, DEFAULTS.sourceControl)
        };
    }catch{
        return DEFAULTS;
    }
};

const persist = (state: Pick<SidebarPanelsState, SidebarPanel>): void => {
    try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            sessions: state.sessions,
            explorer: state.explorer,
            sourceControl: state.sourceControl
        }));
    }catch{
        // Ignore quota/availability errors — panel layout is a nicety, not critical state.
    }
};

/**
 * Per-panel collapse + height for the sidebar's Sessions, Explorer and Source Control sections.
 * Persisted to localStorage so the layout survives navigation and reloads. Heights are clamped to a
 * sane range.
 */
export const useSidebarPanelsStore = create<SidebarPanelsState>((set) => ({
    ...readStored(),
    toggle: (panel) => set((state) => {
        const next = { ...state[panel], collapsed: !state[panel].collapsed };
        const merged = { sessions: state.sessions, explorer: state.explorer, sourceControl: state.sourceControl, [panel]: next };
        persist(merged);
        return { [panel]: next };
    }),
    setHeight: (panel, height) => set((state) => {
        const next = { ...state[panel], height: clampHeight(height) };
        const merged = { sessions: state.sessions, explorer: state.explorer, sourceControl: state.sourceControl, [panel]: next };
        persist(merged);
        return { [panel]: next };
    })
}));
