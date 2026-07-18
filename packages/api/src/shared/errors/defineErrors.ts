import RuntimeError from '@/shared/errors/RuntimeError';
import type { ErrorTable } from '@cloud-code/contracts/shared/errors';

type ErrorFactory = (detail?: string) => RuntimeError;

/**
 * Binds a domain's error table to throwable factories. The table — every `Domain::Cause`
 * bound to its HTTP status once — lives in `@cloud-code/contracts` (it is wire vocabulary the
 * web derives typed code unions from); server-only modules inline it locally. Calling
 * `Errors.Cause()` builds a fresh `RuntimeError` with the `Domain::Cause` message and its
 * status, so `Error.captureStackTrace` points at the throw site. An optional detail appends
 * a runtime suffix: `ConfigError.MissingEnv('PORT')` → `Config::MissingEnv:PORT`.
 */
export const defineErrors = <T extends ErrorTable>({ domain, causes }: T): Record<keyof T['causes'], ErrorFactory> => {
    const factories = {} as Record<keyof T['causes'], ErrorFactory>;
    for(const [cause, status] of Object.entries(causes)){
        factories[cause as keyof T['causes']] = (detail?: string) => {
            const code = detail === undefined ? `${domain}::${cause}` : `${domain}::${cause}:${detail}`;
            return new RuntimeError(code, status);
        };
    }
    return factories;
};
