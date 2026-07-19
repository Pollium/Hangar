import type { Duplex } from 'node:stream';

export interface ResourceLimits{
    memoryMb: number;
    cpus: number;
    pidsLimit: number;
}

export interface CreateContainerSpec{
    image: string;
    name: string;
    env: string[];
    labels: Record<string, string>;
    workdir: string;
    volumeName: string;
    limits: ResourceLimits;
    network: string;
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

export type PtyStream = Duplex & {
    resize: (cols: number, rows: number) => void;
    exitCode: Promise<number | null>;
};
