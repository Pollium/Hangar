/** Narrows an unknown thrown value to a human-readable message, with a fallback. */
export const errorMessage = (err: unknown, fallback = 'Something went wrong.'): string =>
    err instanceof Error ? err.message : fallback;
