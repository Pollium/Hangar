import User from '@/modules/user/models/User';

export default class Seed{
    static #sequence = 0;

    protected sequence(): number{
        return ++Seed.#sequence;
    }

    user(): Promise<User>{
        const n = this.sequence();
        return User.create({
            fullName: `User ${n}`,
            username: `user${n}`,
            email: `user${n}@cloud-code.test`,
            bio: '',
            passwordHash: null,
            avatarUrl: null
        }).save();
    }
}

export const seed = new Seed();
