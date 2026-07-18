import { SessionErrors } from '@cloud-code/contracts/modules/session/errors';
import { defineErrors } from '@/shared/errors/defineErrors';

export const SessionError = defineErrors(SessionErrors);
