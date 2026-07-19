import { useEffect, useMemo, useRef, useState } from 'react';
import { useChannel } from '@/shared/hooks/socket/useChannel';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import type { ChannelStatus } from '@/shared/contracts/channel';
import type { Session } from '@cloud-code/contracts/modules/session/domain';

type FleetConnection = 'connecting' | 'reconnecting' | 'live' | 'offline';

const connectionLabel = (status: ChannelStatus): FleetConnection => {
    if(status === 'open') return 'live';
    if(status === 'reconnecting') return 'reconnecting';
    if(status === 'closed') return 'offline';
    return 'connecting';
};

const byActivity = (left: Session, right: Session): number =>
    new Date(right.lastActiveAt ?? right.createdAt).getTime()
    - new Date(left.lastActiveAt ?? left.createdAt).getTime();

/** The single, real-time source of truth for "sessions in the active project" — no HTTP
 * fallback. Every consumer (sidebar, search, Overview) shares this one socket subscription. */
export const useFleet = () => {
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [snapshotReceived, setSnapshotReceived] = useState(false);
    const revision = useRef(0);
    const clearErrorRef = useRef<() => void>(() => undefined);

    const { send, status, error: channelError, clearError } = useChannel('/fleet', {
        'fleet.snapshot': ({ sessions: next, revision: nextRevision }) => {
            clearErrorRef.current();
            revision.current = nextRevision;
            setSessions([...next].sort(byActivity));
            setSnapshotReceived(true);
        },
        'fleet.session': ({ session, revision: nextRevision }) => {
            if(nextRevision <= revision.current) return;
            revision.current = nextRevision;
            setSessions((current) => {
                const index = current.findIndex(({ id }) => id === session.id);
                const next = index === -1
                    ? [...current, session]
                    : current.map((item) => item.id === session.id ? session : item);
                return next.sort(byActivity);
            });
        },
        'fleet.remove': ({ sessionId, revision: nextRevision }) => {
            if(nextRevision <= revision.current) return;
            revision.current = nextRevision;
            setSessions((current) => current.filter(({ id }) => id !== sessionId));
        }
    });
    clearErrorRef.current = clearError;

    useEffect(() => {
        if(status === 'connecting' || status === 'reconnecting'){
            revision.current = 0;
            setSnapshotReceived(false);
        }
    }, [status]);

    // (Re)select the active project's fleet room on connect, reconnect, and project switch.
    useEffect(() => {
        if(status !== 'open' || activeProjectId === null) return;
        revision.current = 0;
        setSnapshotReceived(false);
        send('fleet.select', { projectId: activeProjectId });
    }, [status, activeProjectId, send]);

    const connection = useMemo(
        () => status === 'open' && !snapshotReceived ? 'connecting' : connectionLabel(status),
        [snapshotReceived, status]
    );
    const error = channelError ?? (status === 'closed' ? 'Fleet connection closed.' : null);

    return {
        sessions,
        connection,
        loading: !snapshotReceived,
        error
    };
};
