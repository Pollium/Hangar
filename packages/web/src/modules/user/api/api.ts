import { call } from '@/shared/api/call';
import { userRoutes } from '@cloud-code/contracts/modules/user/routes';

export const userApi = {
    me: () => call(userRoutes.me),
};
