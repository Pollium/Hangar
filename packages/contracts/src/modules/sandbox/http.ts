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

/** Body for creating a new file or directory in the workspace. */
export interface CreateFileInput{
    /** Absolute path to create, confined to /workspace. */
    path: string;
    /** 'file' touches an empty file (creating parent dirs); 'dir' makes the directory tree. */
    type: 'file' | 'dir';
}

/** Identifies a workspace repo for a git action. `repo` is its path relative to /workspace. */
export interface GitRepoInput{
    repo: string;
}

/** Body for checking out an existing branch in a workspace repo. */
export interface GitCheckoutInput{
    repo: string;
    /** Local or remote branch name to check out (e.g. main, origin/feature). */
    branch: string;
}
