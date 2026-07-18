import PasswordService from '@/modules/auth/services/PasswordService';
import Seed from '@tests/Seed';
import User from '../models/User';

export default class UserSeed extends Seed{
    async passwordUser(password = 'password-123'): Promise<User>{
        const user = await this.user();
        user.passwordHash = await new PasswordService().hash(password);
        return user.save();
    }
}

export const userSeed = new UserSeed();
