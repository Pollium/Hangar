import { call } from '@/shared/api/call';
import { authRoutes } from '@hangar/contracts/modules/auth/routes';
import type { SignInInput, SignUpInput, CheckEmailInput } from '@hangar/contracts/modules/auth/http';

export const authApi = {
    checkEmail: (query: CheckEmailInput) => call(authRoutes.checkEmail, { query }),

    signIn: (body: SignInInput) => call(authRoutes.signIn, { body }),

    signUp: (body: SignUpInput) => call(authRoutes.signUp, { body })
};
