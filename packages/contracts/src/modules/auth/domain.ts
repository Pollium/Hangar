import type { User } from '../user/domain';

export interface AuthSession{
    token: string;
    user: User;
}

export interface EmailAvailability{
    exists: boolean;
}
