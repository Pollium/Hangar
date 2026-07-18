import { FastifyReply, FastifyRequest } from 'fastify';
import type { IValidation } from 'typia';

export type ParamResolver = (req: FastifyRequest, reply?: FastifyReply) => unknown;

/** Compile-time generated body validator, e.g. `typia.misc.createValidatePrune<CreateRoadmapInput>()`. */
export type BodyValidator<T> = (input: unknown) => IValidation<T>;

export interface ParamBinding{
    handlerName: string | symbol;
    index: number;
    resolve: ParamResolver;
}

export interface PaginationOptions{
    defaultLimit?: number;
    maxLimit?: number;
}

/** Pagination window resolved by `@Pagination()` and consumed by services as `take`/`skip`. */
export interface Page{
    limit: number;
    offset: number;
}
