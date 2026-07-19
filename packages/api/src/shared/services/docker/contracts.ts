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
    /** Ownership/discovery labels, e.g. { 'cloud-code.projectId': '12', 'cloud-code.owner': '3' }. */
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
