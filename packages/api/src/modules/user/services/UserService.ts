import PasswordService from '@/modules/auth/services/PasswordService';
import { ChangePasswordInput, UpdateProfileInput } from '@hangar/contracts/modules/user/http';
import { UserError } from '../contracts/domain/errors';
import User from '../models/User';

export default class UserService{
    getProfile(userId: number): Promise<User>{
        return this.#require(userId);
    }

    async updateProfile(userId: number, patch: UpdateProfileInput): Promise<User>{
        const user = await this.#require(userId);

        if(patch.username !== undefined && patch.username !== user.username){
            const taken = await User.findOneBy({ username: patch.username });
            if(taken) throw UserError.UsernameAlreadyTaken();
        }

        // The body arrives validated and pruned by @Body, so the patch is safe to apply whole.
        return Object.assign(user, patch).save();
    }

    async changePassword(userId: number, query: ChangePasswordInput): Promise<void>{
        const password = new PasswordService();
        const user = await this.#require(userId);

        if(user.passwordHash === null || !(await password.verify(query.currentPassword, user.passwordHash))){
            throw UserError.InvalidPassword();
        }

        user.passwordHash = await password.hash(query.newPassword);
        await user.save();
    }

    async deleteProfile(userId: number): Promise<void>{
        const user = await this.#require(userId);
        await user.remove();
    }

    async #require(userId: number): Promise<User>{
        const user = await User.findOneBy({ id: userId });
        if(!user) throw UserError.NotFound();
        return user;
    }
}
