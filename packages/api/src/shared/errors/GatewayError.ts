import { GatewayErrors } from '@hangar/contracts/shared/errors';
import { defineErrors } from '@/shared/errors/defineErrors';

export const GatewayError = defineErrors(GatewayErrors);
