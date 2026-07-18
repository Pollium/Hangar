import type { ErrorCode, ErrorTable } from '../../shared/errors';

export const CliErrors = {
    domain: 'Cli',
    causes: {
        UnknownCli: 404
    }
} as const satisfies ErrorTable;

export type CliErrorCode = ErrorCode<typeof CliErrors>;
