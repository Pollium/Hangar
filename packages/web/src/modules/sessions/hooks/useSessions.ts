import { useEffect } from 'react';
import { useRequest } from 'alova/client';
import { sessionApi } from '@/modules/sessions/api/api';
import { useSessionsStore } from '@/modules/sessions/store/sessions';

export const useSessions = () => {
    const sessions = useSessionsStore((state) => state.sessions);
    const setSessions = useSessionsStore((state) => state.setSessions);

    const { loading, send } = useRequest(() => sessionApi.list(), { immediate: true });

    useEffect(() => {
        void send().then(setSessions).catch(() => setSessions([]));
    }, [send, setSessions]);

    return { sessions, loading, refresh: () => void send().then(setSessions) };
};
