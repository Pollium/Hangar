import type { BaseEntity } from '../../shared/base';

export interface UserProfile{
    fullName: string;
    username: string;
    email: string;
    bio: string;
}

export interface User extends UserProfile, BaseEntity{
    avatarUrl: string | null;
}
