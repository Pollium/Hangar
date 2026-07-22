/** Body for cloning a repository into the project's workspace. */
export interface CloneRepoInput{
    /** Clone URL (https). For private repos the sandbox authenticates via the owner's GITHUB_TOKEN. */
    url: string;
}

/** Body for renaming/moving a workspace entry. Both paths are absolute, confined to /workspace. */
export interface RenameFileInput{
    /** Current absolute path, e.g. /workspace/repo/old.ts. */
    path: string;
    /** New absolute path, e.g. /workspace/repo/new.ts. Must stay within /workspace. */
    to: string;
}

/** Body for deleting a workspace entry (file or directory, recursively). */
export interface DeleteFileInput{
    /** Absolute path to remove, confined to /workspace (never /workspace itself). */
    path: string;
}
