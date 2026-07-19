import { create } from 'zustand';

const STORAGE_KEY = 'cloud-code.activeProjectId';

const readStored = (): number | null => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) ? parsed : null;
};

interface ActiveProjectState{
    activeProjectId: number | null;
    setActiveProject: (id: number) => void;
    /** Reconciles the stored id against the membership list — falls back to the first
     * project when the stored id is missing/stale, does nothing once already valid. */
    reconcile: (projectIds: number[]) => void;
}

export const useActiveProjectStore = create<ActiveProjectState>((set, get) => ({
    activeProjectId: readStored(),
    setActiveProject: (id) => {
        localStorage.setItem(STORAGE_KEY, String(id));
        set({ activeProjectId: id });
    },
    reconcile: (projectIds) => {
        const current = get().activeProjectId;
        if(current !== null && projectIds.includes(current)) return;
        const fallback = projectIds[0] ?? null;
        if(fallback === null) return;
        localStorage.setItem(STORAGE_KEY, String(fallback));
        set({ activeProjectId: fallback });
    }
}));
