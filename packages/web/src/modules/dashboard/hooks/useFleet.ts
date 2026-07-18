import { useState } from 'react';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import type { Session } from '@cloud-code/contracts/modules/session/domain';
import type { FleetSnapshotData, FleetSessionData } from '@cloud-code/contracts/modules/fleet/channel';

export const useFleet = () => {
    const [sessions, setSessions] = useState<Session[]>([]);

    const { status } = useChannel('/fleet', {
        'fleet.snapshot': (data) => setSessions((data as FleetSnapshotData).sessions),
        'fleet.session': (data) => setSessions((prev) => {
            const { sessionId, status: next } = data as FleetSessionData;
            return prev.map((s) => (s.id === sessionId ? { ...s, status: next } : s));
        })
    });

    return { sessions, connection: status };
};
