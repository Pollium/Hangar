import { describe, expect, it, vi } from 'vitest';
import { SignUpInput } from '@hangar/contracts/modules/auth/http';
import { useApp } from '@tests/harness';
import { userSeed } from '@/modules/user/tests/UserSeed';
import User from '@/modules/user/models/User';
import AuthService from '../services/AuthService';

const signUpInput = (overrides: Partial<SignUpInput>): SignUpInput => ({
    fullName: 'Race Case',
    email: 'race@hangar.test',
    username: 'racecase',
    password: 'password-123',
    ...overrides
});

const racedSignUp = async (input: SignUpInput): Promise<unknown> => {
    const spy = vi.spyOn(User, 'findOneBy').mockResolvedValue(null);
    try{
        await new AuthService().signUp(input);
        return null;
    }catch(error){
        return error;
    }finally{
        spy.mockRestore();
    }
};

describe('AuthService signUp race safety net', () => {
    useApp();

    it('maps a raced duplicate email to the 409 domain error', async () => {
        const existing = await userSeed.user();

        const error = await racedSignUp(signUpInput({ email: existing.email }));

        expect(error).toMatchObject({ message: 'Auth::EmailAlreadyRegistered', statusCode: 409 });
    });

    it('maps a raced duplicate username to the 409 domain error', async () => {
        const existing = await userSeed.user();

        const error = await racedSignUp(signUpInput({ username: existing.username }));

        expect(error).toMatchObject({ message: 'Auth::UsernameAlreadyTaken', statusCode: 409 });
    });
});
