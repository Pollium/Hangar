import type { Duplex } from 'node:stream';

export interface ResourceLimits{
    memoryMb: number;
    cpus: number;
    pidsLimit: number;
}

export interface CreateContainerSpec{
    image: string;
    name: string;
    /** Fully resolved `KEY=value` entries — secrets are decrypted immediately before this call. */
    env: string[];
    /** Ownership/discovery labels, e.g. { 'hangar.projectId': '12', 'hangar.owner': '3' }. */
    labels: Record<string, string>;
    workdir: string;
    /** Named volume mounted at /workspace for repo + CLI config persistence. */
    volumeName: string;
    limits: ResourceLimits;
    /** Dedicated bridge network, never the control-plane network. */
    network: string;
    /** Long-lived keeper command so the container survives with no active session. */
    keeperCommand: string[];
}

export interface ExecOptions{
    cwd?: string;
    env?: string[];
}

export interface ExecResult{
    output: string;
    exitCode: number;
}

export interface ContainerStats{
    cpuPercent: number;
    memUsedMb: number;
    memLimitMb: number;
}

/** A TTY-attached duplex with resize support and the eventual Docker exec exit code. */
export type PtyStream = Duplex & {
    resize: (cols: number, rows: number) => void;
    exitCode: Promise<number | null>;
};

/**
 * The container operations the sandbox/session layer needs. Implemented by a remote handle that
 * forwards to the project owner's agent — the control plane holds no Docker socket of its own.
 */
export interface IContainerHandle{
    readonly id: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    remove(withVolumes?: boolean): Promise<void>;
    isRunning(): Promise<boolean>;
    volumeAt(destination: string): Promise<string | undefined>;
    exec(cmd: string[], opts?: ExecOptions): Promise<ExecResult>;
    openPty(cmd: string[], opts?: ExecOptions): Promise<PtyStream>;
    stats(): Promise<ContainerStats>;
}

/** Docker daemon operations, forwarded to an agent. `get` returns a handle bound to the same agent. */
export interface IDockerService{
    get(containerId: string): IContainerHandle;
    ensureNetwork(name: string): Promise<void>;
    ensureVolume(name: string, labels?: Record<string, string>): Promise<void>;
    imageExists(image: string): Promise<boolean>;
    pull(image: string): Promise<void>;
    create(spec: CreateContainerSpec): Promise<IContainerHandle>;
    list(labels: Record<string, string>): Promise<IContainerHandle[]>;
    /** Opens a raw TCP relay to a port inside a container (codespace HTTP/WS proxy). */
    connect(containerId: string, port: number): Promise<PtyStream>;
}
