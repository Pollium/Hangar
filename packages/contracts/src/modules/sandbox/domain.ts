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

/** One changed path in the working tree, as reported by `git status --porcelain`. */
export interface GitChange{
    /** Path relative to the repo root, e.g. src/index.ts. */
    path: string;
    /**
     * Two-letter porcelain code (index + worktree), e.g. ' M', 'A ', '??', 'MM'.
     * The UI derives a human label/staged flag from it.
     */
    code: string;
    /** True when the change (or part of it) is staged in the index. */
    staged: boolean;
    /** True for untracked files ('??'). */
    untracked: boolean;
}

/**
 * Source-control view of one workspace repo (a git repo found under /workspace).
 * `slug` is the repo's path relative to /workspace (may be nested, e.g. `apps/web`);
 * `branch` is the checked-out branch (null on a detached HEAD or empty repo).
 * `ahead`/`behind` count commits vs the upstream (0 when there is no upstream).
 */
export interface GitRepoInfo{
    slug: string;
    branch: string | null;
    /** Upstream tracking branch (e.g. origin/main), or null when none is configured. */
    upstream: string | null;
    ahead: number;
    behind: number;
    branches: GitBranch[];
    commits: GitCommit[];
    changes: GitChange[];
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
