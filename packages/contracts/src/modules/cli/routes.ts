import { get } from '../../shared/routing';
import type { CliDescriptor } from './domain';

export const cliRoutes = {
    list: get<CliDescriptor[]>('/clis')
};
