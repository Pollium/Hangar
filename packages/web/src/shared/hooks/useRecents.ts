import { useState } from 'react';
import { getRecents } from '@/shared/utils/recents';
import type { RecentEntry } from '@/shared/utils/recents';

export const useRecents = (): RecentEntry[] => {
    const [recents] = useState<RecentEntry[]>(getRecents);
    return recents;
};
