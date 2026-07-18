export interface RecentEntry{
    section: string;
    label: string;
    path: string;
    at: number;
}

const KEY = 'pollium.recents';
const LIMIT = 5;

export const getRecents = (): RecentEntry[] => {
    try{
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    }catch{
        return [];
    }
};

export const pushRecent = (entry: Omit<RecentEntry, 'at'>): void => {
    const next = [{ ...entry, at: Date.now() }, ...getRecents().filter((r) => r.path !== entry.path)].slice(0, LIMIT);
    try{
        localStorage.setItem(KEY, JSON.stringify(next));
    }catch{
        return;
    }
};
