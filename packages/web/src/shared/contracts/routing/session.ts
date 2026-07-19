import type { User } from '@hangar/contracts/modules/user/domain';

export interface Session{
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
}
