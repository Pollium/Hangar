import { AuthErrors } from '@hangar/contracts/modules/auth/errors';
import { defineErrors } from '@/shared/errors/defineErrors';

export const AuthError = defineErrors(AuthErrors);
