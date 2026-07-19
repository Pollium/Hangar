export type SessionSearchNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export const nextSessionSearchIndex = (
    current: number,
    length: number,
    key: SessionSearchNavigationKey
): number => {
    if(length <= 0) return -1;
    if(key === 'Home') return 0;
    if(key === 'End') return length - 1;
    if(key === 'ArrowDown') return current < 0 ? 0 : (current + 1) % length;
    return current <= 0 ? length - 1 : current - 1;
};
