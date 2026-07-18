import { createParamDecorator } from './params';
import { parseBody } from './parseBody';
import { parseId } from './parseId';
import { parsePagination } from './parsePagination';
import { RequestError } from '@/shared/errors/RequestError';
import type { BodyValidator, PaginationOptions } from '@/shared/contracts/params';
import type { UploadedFile as UploadedFilePayload } from '@/shared/contracts/upload';

/**
 * Injects the request body, validated and pruned against the parameter's DTO annotation:
 * `@Body() body: CreateRoadmapInput` is enough — the `autoValidateBody` plugin
 * (vite.config.ts) injects `typia.misc.createValidatePrune<CreateRoadmapInput>()` at build
 * time from the annotation. An invalid body is rejected with 400 `Request::ValidationFailed`
 * carrying a per-field message map (see `parseBody`); unknown keys are stripped. A validator
 * can also be passed explicitly; without plugin nor validator the body is injected as-is.
 */
export const Body = <T>(validate?: BodyValidator<T>): ParameterDecorator =>
    createParamDecorator((req) => validate ? parseBody(validate, req.body) : req.body);

/**
 * Injects a route param coerced to a positive integer id, rejecting a missing
 * or malformed value with 400 `Request::InvalidId` (see `parseId`).
 */
export const NumericParam = (name: string): ParameterDecorator =>
    createParamDecorator((req) => parseId((req.params as Record<string, string>)[name]));

export const Param = (name: string): ParameterDecorator =>
    createParamDecorator((req) => (req.params as Record<string, string>)[name]);

/**
 * Injects a query-string value by name (`req.query`), or the whole parsed query
 * object when called with no name.
 */
export const Query = (name?: string): ParameterDecorator =>
    createParamDecorator((req) =>
        name === undefined ? req.query : (req.query as Record<string, string>)[name]);

/**
 * Injects a required query param coerced to a positive integer id, rejecting a
 * missing or malformed value with 400 `Request::InvalidId` (see `parseId`). The
 * query-string twin of `NumericParam`, used where a cross-module foreign key is
 * expressed as a filter (e.g. `?workspaceId=1`) rather than a path segment.
 */
export const NumericQuery = (name: string): ParameterDecorator =>
    createParamDecorator((req) => parseId((req.query as Record<string, string>)[name]));

/**
 * Injects a `Page` parsed from the `limit`/`offset` query params. Missing values
 * fall back to `defaultLimit` (50) and offset 0; `limit` is clamped to `maxLimit`
 * (100); a non-integer or out-of-range value is rejected with 400
 * `Request::InvalidPagination`. Pair with a `Paginated` return so the response
 * carries `meta` (see `BaseController`).
 */
export const Pagination = (options?: PaginationOptions): ParameterDecorator =>
    createParamDecorator((req) => parsePagination(req.query, options));

/**
 * Injects the first uploaded file of a `multipart/form-data` request as a
 * buffered `UploadedFile`. Translates multipart failures into domain errors so
 * the service layer never touches transport concerns: no file part →
 * `Request::FileMissing` (400); a part exceeding the configured `fileSize`
 * limit → `Request::FileTooLarge` (413). The declared content-type is ignored
 * here; the service sniffs the real MIME type from the bytes.
 */
export const UploadedFile = (): ParameterDecorator =>
    createParamDecorator(async (req): Promise<UploadedFilePayload> => {
        const part = await req.file();
        if(!part) throw RequestError.FileMissing();

        try{
            const buffer = await part.toBuffer();
            return { filename: part.filename, buffer };
        }catch(error){
            if(error instanceof Error && (error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE'){
                throw RequestError.FileTooLarge();
            }
            throw error;
        }
    });
