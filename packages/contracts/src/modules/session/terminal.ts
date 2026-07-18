import type { SessionStatus } from './domain';

// Inbound frames (browser → server)
export interface TerminalJoinPayload{
    sessionId: number;
}

export interface TerminalInputPayload{
    data: string;
}

export interface TerminalResizePayload{
    cols: number;
    rows: number;
}

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

export type TerminalFrame =
    | { type: 'terminal.output'; data: TerminalOutputData }
    | { type: 'terminal.status'; data: TerminalStatusData }
    | { type: 'terminal.exit'; data: TerminalExitData };
