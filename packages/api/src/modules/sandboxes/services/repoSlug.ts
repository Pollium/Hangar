/**
 * Derives the /workspace subdirectory name for a repo URL: the last path segment, minus `.git`,
 * sanitized to a safe filename. Shared by the provisioner (boot-time clone) and the live clone
 * action so both land a repo in the same predictable place.
 */
export const repoSlug = (url: string): string => {
    const trimmed = url.replace(/\.git$/i, '').replace(/\/+$/, '');
    const last = trimmed.split('/').pop() || '';
    const safe = last.replace(/[^a-zA-Z0-9._-]/g, '-');
    return safe && safe !== '.' && safe !== '..' ? safe : 'repo';
};
