import { SessionErrors } from '@hangar/contracts/modules/session/errors';
import { defineErrors } from '@/shared/errors/defineErrors';

export const SessionError = defineErrors(SessionErrors);
