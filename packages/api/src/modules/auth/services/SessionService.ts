import { Session } from '../contracts/domain/auth';
import JWTService from './JWTService';
import User from '@/modules/user/models/User';

export default class SessionService{
    #jwt = new JWTService();

    create(user: User): Session{
        return {
            token: this.#jwt.sign(user.id),
            user
        };
    }
}
