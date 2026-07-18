import type { Session, SessionStatus } from '../session/domain';

export interface FleetSnapshotData{
    sessions: Session[];
}

export interface FleetSessionData{
    sessionId: number;
    status: SessionStatus;
}

export type FleetFrame =
    | { type: 'fleet.snapshot'; data: FleetSnapshotData }
    | { type: 'fleet.session'; data: FleetSessionData };
