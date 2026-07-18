import { get, post } from '../../shared/routing';
import type { SignInInput, SignUpInput } from './http';
import type { AuthSession, EmailAvailability } from './domain';

/** `checkEmail` takes the email as a query param. */
export const authRoutes = {
    checkEmail: get<EmailAvailability>('/auth/email-availability'),
    signIn: post<SignInInput, AuthSession>('/auth/sign-in'),
    signUp: post<SignUpInput, AuthSession>('/auth/sign-up')
};
