import type { Session } from '../session/domain';

// Inbound (browser → server)
export interface FleetSelectPayload{
    projectId: number;
}

export interface FleetSnapshotData{
    sessions: Session[];
    revision: number;
}

export interface FleetSessionData{
    session: Session;
    revision: number;
}

export interface FleetRemoveData{
    sessionId: number;
    revision: number;
}

export type FleetFrame =
    | { type: 'fleet.snapshot'; data: FleetSnapshotData }
    | { type: 'fleet.session'; data: FleetSessionData }
    | { type: 'fleet.remove'; data: FleetRemoveData };
