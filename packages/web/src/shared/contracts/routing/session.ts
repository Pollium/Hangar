import type { User } from '@cloud-code/contracts/modules/user/domain';

export interface Session{
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
}
