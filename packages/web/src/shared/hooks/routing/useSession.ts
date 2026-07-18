import { useRequest } from 'alova/client';
import { useAuthStore } from '@/modules/auth/store/auth';
import { userApi } from '@/modules/user/api/api';
import type { Session } from '@/shared/contracts/routing/session';

export const useSession = (): Session => {
    const token = useAuthStore((state) => state.token);

    // Fires only on mount (alova useRequest is not watching-state driven). The sign-in flow
    // navigates into the app, which remounts the guard subtree and refetches with the new token;
    // sign-out never fires a stray tokenless /me. See issue #38 plan for the reasoning.
    const { data: user, loading } = useRequest(userApi.me, { immediate: !!token });

    const isAuthenticated = !!token;
    const isLoading = isAuthenticated && loading && !user;

    // GET /user/me does not yet expose the caller's OrganizationRole, so the admin tier fails
    // safe: nobody is treated as admin until the API returns role (issue #38 open dependency).
    const isAdmin = false;

    return { token, user: user ?? null, isAuthenticated, isAdmin, isLoading };
};
