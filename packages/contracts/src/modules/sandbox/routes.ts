import { get, post, del } from '../../shared/routing';
import type { Sandbox, SandboxUsage, FileEntry, GitInfo } from './domain';
import type { CloneRepoInput, RenameFileInput, DeleteFileInput, CreateFileInput, GitRepoInput, GitCheckoutInput } from './http';

/** One sandbox per project, keyed by projectId. */
export const sandboxRoutes = {
    get: get<Sandbox>('/sandboxes/:projectId'),
    provision: post<void, Sandbox>('/sandboxes/:projectId'),
    start: post<void, Sandbox>('/sandboxes/:projectId/start'),
    stop: post<void, Sandbox>('/sandboxes/:projectId/stop'),
    usage: get<SandboxUsage>('/sandboxes/:projectId/usage'),
    destroy: del('/sandboxes/:projectId'),
    // Workspace file explorer: immediate children of `?path=` (default /workspace).
    files: get<FileEntry[]>('/sandboxes/:projectId/files'),
    // Recursive file search across the workspace (matches `?q=` against paths; files only).
    search: get<FileEntry[]>('/sandboxes/:projectId/files/search'),
    // Source control: workspace repos, plus branches/commits/status of the `?repo=` slug when given.
    git: get<GitInfo>('/sandboxes/:projectId/git'),
    // Rename/move a workspace entry.
    renameFile: post<RenameFileInput, { ok: true }>('/sandboxes/:projectId/files/rename'),
    // Delete a workspace entry (recursively).
    deleteFile: post<DeleteFileInput, { ok: true }>('/sandboxes/:projectId/files/delete'),
    // Create a new file or directory.
    createFile: post<CreateFileInput, { ok: true }>('/sandboxes/:projectId/files/create'),
    // Git write actions on a workspace repo. Each returns the refreshed GitInfo for that repo.
    gitPull: post<GitRepoInput, GitInfo>('/sandboxes/:projectId/git/pull'),
    gitPush: post<GitRepoInput, GitInfo>('/sandboxes/:projectId/git/push'),
    gitFetch: post<GitRepoInput, GitInfo>('/sandboxes/:projectId/git/fetch'),
    gitCheckout: post<GitCheckoutInput, GitInfo>('/sandboxes/:projectId/git/checkout'),
    // Clone a repo into the running workspace and persist it to the project.
    clone: post<CloneRepoInput, { ok: true }>('/sandboxes/:projectId/clone')
};
