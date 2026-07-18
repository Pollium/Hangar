import type { BaseEntity } from '../../shared/base';

export type SandboxStatus = 'provisioning' | 'running' | 'stopped' | 'error';

export interface ResourceLimits{
    memoryMb: number;
    cpus: number;
    pidsLimit: number;
}

export interface Sandbox extends BaseEntity{
    projectId: number;
    ownerId: number;
    containerId: string | null;
    volumeName: string;
    status: SandboxStatus;
    limits: ResourceLimits;
    lastStartedAt: string | null;
}

export interface SandboxUsage{
    cpuPercent: number;
    memUsedMb: number;
    memLimitMb: number;
}
