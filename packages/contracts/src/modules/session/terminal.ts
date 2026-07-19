import type { SessionStatus } from './domain';

export interface TerminalDimensions{
    cols: number;
    rows: number;
}

// Inbound frames (browser → server)
export interface TerminalJoinPayload extends Partial<TerminalDimensions>{
    sessionId: number;
    restart?: boolean;
}

export interface TerminalInputPayload{
    data: string;
}

export interface TerminalResizePayload extends TerminalDimensions{}

// Outbound frame data (server → browser)
export interface TerminalOutputData{
    chunk: string;
}

export interface TerminalStatusData{
    status: SessionStatus;
}

export interface TerminalExitData{
    code: number | null;
}

export interface TerminalReadyData extends Partial<TerminalDimensions>{
    sessionId: number;
}

export interface TerminalClosedData{
    sessionId: number;
    reason: 'stopped' | 'removed' | 'restarted';
}

export type TerminalFrame =
    | { type: 'terminal.output'; data: TerminalOutputData }
    | { type: 'terminal.status'; data: TerminalStatusData }
    | { type: 'terminal.exit'; data: TerminalExitData }
    | { type: 'terminal.ready'; data: TerminalReadyData }
    | { type: 'terminal.closed'; data: TerminalClosedData };
