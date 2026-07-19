import type {
    FleetRemoveData,
    FleetSessionData,
    FleetSnapshotData
} from '@hangar/contracts/modules/fleet/channel';
import type {
    TerminalClosedData,
    TerminalExitData,
    TerminalOutputData,
    TerminalReadyData,
    TerminalStatusData
} from '@hangar/contracts/modules/session/terminal';

export type ChannelStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface OutboundFrame{
    type?: string;
    data?: unknown;
    error?: string;
}

export type MessageHandler<T> = (data: T) => void;

export interface ChannelHandlers{
    [type: string]: MessageHandler<unknown>;
}

export interface ChannelMap{
    '/fleet': {
        'fleet.snapshot': FleetSnapshotData;
        'fleet.session': FleetSessionData;
        'fleet.remove': FleetRemoveData;
    };
    '/sessions/terminal': {
        'terminal.output': TerminalOutputData;
        'terminal.status': TerminalStatusData;
        'terminal.exit': TerminalExitData;
        'terminal.closed': TerminalClosedData;
        'terminal.ready': TerminalReadyData;
    };
}

export type HandlersFor<P extends string> = P extends keyof ChannelMap
    ? { [K in keyof ChannelMap[P]]?: MessageHandler<ChannelMap[P][K]> }
    : ChannelHandlers;

export interface ChannelApi{
    send: (type: string, data?: unknown) => boolean;
    clearError: () => void;
    status: ChannelStatus;
    error: string | null;
}
