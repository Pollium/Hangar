import { CliError } from '../contracts/domain/errors';
import type { CliAdapter } from './CliAdapter';
import ClaudeCodeAdapter from './ClaudeCodeAdapter';
import CodexAdapter from './CodexAdapter';
import OpenCodeAdapter from './OpenCodeAdapter';
import GeminiAdapter from './GeminiAdapter';
import BashAdapter from './BashAdapter';

const adapters = new Map<string, CliAdapter>();

const register = (adapter: CliAdapter): void => {
    adapters.set(adapter.id, adapter);
};

[ClaudeCodeAdapter, CodexAdapter, OpenCodeAdapter, GeminiAdapter, BashAdapter].forEach(register);

export const getAdapter = (id: string): CliAdapter => {
    const adapter = adapters.get(id);
    if(!adapter) throw CliError.UnknownCli(id);
    return adapter;
};

export const listAdapters = (): CliAdapter[] => [...adapters.values()];
