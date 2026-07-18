import { QueryFailedError } from 'typeorm';
import { SignInInput, SignUpInput } from '@cloud-code/contracts/modules/auth/http';
import { EmailAvailability } from '@cloud-code/contracts/modules/auth/domain';
import { Session } from '../contracts/domain/auth';
import { AuthError } from '../contracts/domain/errors';
import { eventBus } from '@/shared/events/EventBus';
import { config } from '@/shared/config';
import ValidationError from '@/shared/errors/ValidationError';
import PasswordService from './PasswordService';
import User from '@/modules/user/models/User';
import SessionService from './SessionService';

export default class AuthService{
    #session = new SessionService();

    async signIn(query: SignInInput): Promise<Session>{
        const password = new PasswordService();
        const user = await User.findOneBy({ email: query.email });

        if(!user || user.passwordHash === null || !(await password.verify(query.password, user.passwordHash))){
            throw AuthError.InvalidCredentials();
        }

        return this.#session.create(user);
    }

    async signUp(query: SignUpInput): Promise<Session>{
        if(!config.allowSignup) throw AuthError.SignupDisabled();

        const password = new PasswordService();
        if(await User.findOneBy({ email: query.email })) throw AuthError.EmailAlreadyRegistered();
        if(await User.findOneBy({ username: query.username })) throw AuthError.UsernameAlreadyTaken();

        const user = await this.#insertUser(query, await password.hash(query.password));

        eventBus.emit('user.created', { userId: user.id });

        return this.#session.create(user);
    }

    async checkEmail(email: string | undefined): Promise<EmailAvailability>{
        if(!email) throw new ValidationError({ email: 'Required' });
        const user = await User.findOneBy({ email });
        return { exists: !!user };
    }

    async #insertUser(query: SignUpInput, passwordHash: string): Promise<User>{
        try{
            return await User.create({
                fullName: query.fullName,
                username: query.username,
                email: query.email,
                bio: '',
                passwordHash,
                avatarUrl: null
            }).save();
        }catch(error){
            throw this.#duplicateUserError(error);
        }
    }

    #duplicateUserError(error: unknown): unknown{
        if(!(error instanceof QueryFailedError)) return error;

        const driver = error.driverError as { code?: string; message?: string; detail?: string };
        if(driver.code !== 'SQLITE_CONSTRAINT_UNIQUE' && driver.code !== '23505') return error;

        const detail = [driver.message, driver.detail, error.message].join(' ');
        return detail.includes('username') ? AuthError.UsernameAlreadyTaken() : AuthError.EmailAlreadyRegistered();
    }
}
