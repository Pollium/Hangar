import type { UserProfile } from '@hangar/contracts/modules/user/domain';
import type { BaseFields } from '@/shared/contracts/base';

export interface UserFields extends UserProfile{
    passwordHash: string | null;
    avatarUrl: string | null;
}

export type PublicUser = UserProfile & BaseFields;
