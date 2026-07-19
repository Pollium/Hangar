import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import RouteLoader from '@/shared/components/routing/RouteLoader';

// Composes on top of ProtectedGuard via route nesting: authentication is already enforced by
// the parent, so this only adds the "has a project" check. /onboarding and /invites/:token stay
// reachable either way — they're the two ways out of the zero-project state.
const isExempt = (pathname: string): boolean =>
    pathname === '/onboarding' || pathname.startsWith('/invites/');

const OnboardingGuard = () => {
    const { projects, loading } = useProjects();
    const location = useLocation();

    if(loading) return <RouteLoader />;

    const hasProject = projects.length > 0;
    if(!hasProject && !isExempt(location.pathname)) return <Navigate to='/onboarding' replace />;
    if(hasProject && location.pathname === '/onboarding') return <Navigate to='/' replace />;
    return <Outlet />;
};

export default OnboardingGuard;
