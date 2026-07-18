import type { AuthErrorCode } from '@cloud-code/contracts/modules/auth/errors';

/**
 * Friendly copy for auth wire codes surfaced as form submit errors. Typed against the
 * contract's code union, so a renamed cause breaks here at compile time instead of
 * silently showing the raw `Auth::Cause` string. Unmapped codes fall back to the raw code.
 */
export const authErrorMessages: Partial<Record<AuthErrorCode, string>> = {
    'Auth::InvalidCredentials': 'Wrong email or password.',
    'Auth::EmailAlreadyRegistered': 'This email is already registered.',
    'Auth::UsernameAlreadyTaken': 'This username is taken.',
    'Auth::SignupDisabled': 'Registration is disabled on this server.'
};
