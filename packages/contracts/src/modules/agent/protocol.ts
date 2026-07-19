// Wire protocol for the outbound-agent tunnel. The agent (on the user's VPS) is the WebSocket
// client dialing the control plane; the control plane then issues RPCs and opens streams over
// that single socket. Every project's containers live on the agent's host — the control plane
// never runs Docker itself.

export type AgentOp =
    | 'docker.ensureNetwork'
    | 'docker.ensureVolume'
    | 'docker.imageExists'
    | 'docker.pull'
    | 'docker.create'
    | 'docker.list'
    | 'container.start'
    | 'container.stop'
    | 'container.remove'
    | 'container.isRunning'
    | 'container.volumeAt'
    | 'container.exec'
    | 'container.stats'
    | 'pty.open'
    | 'tcp.open';

/** Control plane → agent: a request/response RPC. `pty.open`/`tcp.open` additionally open a
 *  stream keyed by the request `id`. */
export interface RpcRequest{
    t: 'req';
    id: string;
    op: AgentOp;
    payload: unknown;
}

/** Agent → control plane: the reply to an `RpcRequest`. */
export interface RpcResponse{
    t: 'res';
    id: string;
    ok: boolean;
    result?: unknown;
    error?: string;
}

/** Stream payload, either direction, base64-encoded so everything rides one JSON channel. */
export interface StreamData{
    t: 'sd';
    sid: string;
    b64: string;
}

/** Control plane → agent: resize a PTY stream. */
export interface StreamResize{
    t: 'sr';
    sid: string;
    cols: number;
    rows: number;
}

/** Agent → control plane: a PTY exited with this code. */
export interface StreamExit{
    t: 'sx';
    sid: string;
    code: number | null;
}

/** Either direction: the stream is closed. */
export interface StreamClose{
    t: 'sc';
    sid: string;
}

export type ControlToAgent = RpcRequest | StreamData | StreamResize | StreamClose;
export type AgentToControl = RpcResponse | StreamData | StreamExit | StreamClose;
export type AgentFrame = RpcRequest | RpcResponse | StreamData | StreamResize | StreamExit | StreamClose;

// ---- op payload / result shapes (used with casts on both sides) ----

export interface CreateContainerSpecWire{
    image: string;
    name: string;
    env: string[];
    labels: Record<string, string>;
    workdir: string;
    volumeName: string;
    limits: { memoryMb: number; cpus: number; pidsLimit: number };
    network: string;
    keeperCommand: string[];
}

export interface ListedContainer{
    id: string;
    running: boolean;
    mounts: Array<{ type: string; destination: string; name?: string }>;
}

export interface ExecPayload{
    id: string;
    cmd: string[];
    opts?: { cwd?: string; env?: string[] };
}

export interface ExecResultWire{
    output: string;
    exitCode: number;
}

export interface PtyOpenPayload{
    id: string;
    cmd: string[];
    opts?: { cwd?: string; env?: string[] };
}

/** Open a raw TCP relay to a port inside a project container (used for the codespace proxy). */
export interface TcpOpenPayload{
    id: string;
    port: number;
}
