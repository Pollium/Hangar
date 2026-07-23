/** The sandbox workspace root; every project's files live under it. */
export const WORKSPACE = '/workspace';

/** Parent directory of an absolute workspace path; falls back to the workspace root. */
export const parentDir = (path: string): string => {
    const cut = path.lastIndexOf('/');
    const parent = cut > 0 ? path.slice(0, cut) : WORKSPACE;
    return parent.startsWith(WORKSPACE) ? parent : WORKSPACE;
};

/** Last path segment (file or folder name) of an absolute path. */
export const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/** Path relative to the workspace root (drops the leading `/workspace/`). */
export const workspaceRelative = (path: string): string =>
    path.startsWith(`${WORKSPACE}/`) ? path.slice(WORKSPACE.length + 1) : path;
