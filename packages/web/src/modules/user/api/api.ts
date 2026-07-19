import { invalidateCache } from 'alova';
import { alova } from '@/app/alova';
import { call } from '@/shared/api/call';
import { userRoutes } from '@hangar/contracts/modules/user/routes';
import type { UpdateProfileInput } from '@hangar/contracts/modules/user/http';

export const userApi = {
    me: () => call(userRoutes.me),
    updateProfile: async (body: UpdateProfileInput) => {
        const user = await call(userRoutes.updateProfile, { body });
        invalidateCache(alova.Get(userRoutes.me.path));
        return user;
    }
};
