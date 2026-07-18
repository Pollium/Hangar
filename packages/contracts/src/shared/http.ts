/** Pagination window echoed alongside `data` when a handler returns `Paginated`. */
export interface PageMeta{
    total: number;
    limit: number;
    offset: number;
}

/** Canonical success envelope: every non-empty handler result is wrapped in this. */
export interface ApiResponse<T>{
    data: T;
    meta?: PageMeta;
}

/** Canonical error envelope, emitted by the global error handler. */
export interface ApiError{
    error: string;
    /** Per-field messages, present when the error is a request-body validation failure. */
    errors?: Record<string, string>;
}
