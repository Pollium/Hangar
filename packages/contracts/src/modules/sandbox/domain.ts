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

/** One entry in the workspace file explorer (immediate child of a directory). */
export interface FileEntry{
    name: string;
    /** Absolute path inside the sandbox, e.g. /workspace/repo/src. */
    path: string;
    type: 'dir' | 'file';
}

/** A git branch in a workspace repo. `current` marks the checked-out branch. */
export interface GitBranch{
    name: string;
    /** True for the branch HEAD points at. */
    current: boolean;
    /** True for remote-tracking branches (e.g. origin/main). */
    remote: boolean;
}

/** A single commit from a repo's history, newest first in listings. */
export interface GitCommit{
    /** Abbreviated hash, e.g. 3764297. */
    hash: string;
    subject: string;
    author: string;
    /** ISO-8601 author date. */
    date: string;
}

/**
 * Source-control view of one workspace repo (a /workspace subdirectory that is a git repo).
 * `slug` is the subdirectory name; `branch` is the checked-out branch (null on a detached HEAD
 * or empty repo).
 */
export interface GitRepoInfo{
    slug: string;
    branch: string | null;
    branches: GitBranch[];
    commits: GitCommit[];
}

/**
 * Source-control payload for the workspace. `repos` is every git repo found under /workspace
 * (by subdirectory slug); `selected` is the detailed branches/commits view of the requested
 * repo, or null when none was requested or the workspace has no repos.
 */
export interface GitInfo{
    repos: string[];
    selected: GitRepoInfo | null;
}
