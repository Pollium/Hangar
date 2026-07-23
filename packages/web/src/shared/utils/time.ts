/**
 * Relative-time formatters shared across the UI. Two shapes are used:
 * - `relativeTime` — coarse "just now / 5m ago / 3h ago / 2d ago", for lists and cards. Accepts an
 *   optional label for the null/empty case (e.g. "No activity yet", "—") and an optional `now`
 *   reference — pass a state-driven tick to keep the label fresh as the component re-renders.
 * - `compactAge` — terse "45s / 5m / 3h / 2d / 1y" with no "ago" suffix, for dense rows like the
 *   commit list, where seconds and years both matter.
 */

const MINUTE = 60_000;

export const relativeTime = (value: string | null | undefined, emptyLabel = '—', now = Date.now()): string => {
    if(!value) return emptyLabel;
    const parsed = Date.parse(value);
    if(Number.isNaN(parsed)) return emptyLabel;
    const minutes = Math.floor(Math.max(0, now - parsed) / MINUTE);
    if(minutes < 1) return 'just now';
    if(minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if(hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const AGE_UNITS: Array<[seconds: number, suffix: string]> = [
    [31_536_000, 'y'], [2_592_000, 'mo'], [86_400, 'd'], [3_600, 'h'], [60, 'm']
];

export const compactAge = (value: string | null | undefined): string => {
    if(!value) return '';
    const parsed = Date.parse(value);
    if(Number.isNaN(parsed)) return '';
    const secs = Math.max(0, Math.round((Date.now() - parsed) / 1000));
    for(const [size, suffix] of AGE_UNITS){
        if(secs >= size) return `${Math.floor(secs / size)}${suffix}`;
    }
    return `${secs}s`;
};
