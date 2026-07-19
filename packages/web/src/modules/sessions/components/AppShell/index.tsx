import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollShadow } from '@heroui/react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Plus } from 'lucide-react';
import { SessionSidebar } from '@/modules/sessions/components/SessionSidebar';
import { SessionSearch } from '@/modules/sessions/components/SessionSearch';
import { NewSessionModal } from '@/modules/sessions/components/NewSessionModal';
import { UserMenu } from '@/modules/sessions/components/UserMenu';
import { ProjectSwitcher } from '@/modules/projects/components/ProjectSwitcher';
import { NewProjectModal } from '@/modules/projects/components/NewProjectModal';
import { ShareProjectButton } from '@/modules/projects/components/ShareProjectButton';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';
import { useNewProjectModalStore } from '@/modules/projects/store/newProjectModal';
import { useFleet } from '@/modules/sessions/hooks/useFleet';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { useSession } from '@/shared/hooks/routing/useSession';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import type { Theme } from '@/shared/utils/theme';

const NAV = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/settings', label: 'Environment', icon: Settings }
];

const navClass = (active: boolean): string =>
    `mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors ${
        active ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
    }`;

const mobileNavClass = (active: boolean): string =>
    `flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
        active ? 'font-medium text-accent' : 'text-muted hover:text-foreground'
    }`;

interface Props{
    headerActions?: ReactNode;
    children: ReactNode;
    /** Full-height content without the scroll wrapper; navigation remains visible. */
    bleed?: boolean;
}

export const AppShell = ({ headerActions, children, bleed = false }: Props) => {
    const navigate = useNavigate();
    const { user } = useSession();
    const { sessions, loading: sessionsLoading } = useFleet();
    const openNewSession = useNewSessionModalStore((state) => state.open);
    const openNewProject = useNewProjectModalStore((state) => state.open);
    const [theme, setTheme] = useState<Theme>(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    };

    const signOut = () => {
        useAuthStore.getState().clear();
        navigate('/sign-in');
    };

    return (
        <div className='flex h-dvh bg-background text-foreground'>
            <aside className='hidden w-60 shrink-0 flex-col md:flex'>
                <nav className='flex flex-col gap-0.5 pt-3' aria-label='Primary navigation'>
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
                                <span className='flex size-5 items-center justify-center'><Icon className='size-4' aria-hidden='true' /></span>
                                <span className='truncate'>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className='flex items-center justify-between px-4 pt-5 pb-1.5'>
                    <span className='mono-label text-muted'>Sessions</span>
                    <button
                        type='button'
                        onClick={openNewSession}
                        className='grid size-6 place-items-center rounded text-muted transition-colors hover:text-accent'
                        aria-label='New session'
                    >
                        <Plus className='size-3.5' aria-hidden='true' />
                    </button>
                </div>

                <SessionSidebar sessions={sessions} loading={sessionsLoading} />
            </aside>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                <header className='relative flex h-14 shrink-0 items-center gap-2 px-4 sm:gap-3 sm:px-6'>
                    <ProjectSwitcher />
                    <button
                        type='button'
                        onClick={openNewProject}
                        aria-label='New project'
                        className='grid size-6 shrink-0 place-items-center rounded text-muted transition-colors hover:text-accent'
                    >
                        <Plus className='size-3.5' aria-hidden='true' />
                    </button>
                    <div className='pointer-events-none absolute left-1/2 top-1/2 z-20 hidden w-[clamp(14rem,38vw,34rem)] -translate-x-1/2 -translate-y-1/2 md:block'>
                        <div className='pointer-events-auto'>
                            <SessionSearch sessions={sessions} loading={sessionsLoading} />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1' />
                    {headerActions}
                    <button
                        type='button'
                        onClick={openNewSession}
                        aria-label='New session'
                        className='grid size-8 place-items-center text-muted transition-colors hover:text-accent md:hidden'
                    >
                        <Plus className='size-4' aria-hidden='true' />
                    </button>
                    <ShareProjectButton />
                    <NotificationBell />
                    <UserMenu user={user} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOut} />
                </header>
                <main className='min-h-0 flex-1 overflow-hidden pb-14 md:pb-0'>
                    {bleed ? children : <ScrollShadow className='h-full pt-8'>{children}</ScrollShadow>}
                </main>
            </div>

            <nav className='fixed inset-x-0 bottom-0 z-50 grid h-14 grid-cols-2 border-t border-hairline bg-background/95 backdrop-blur md:hidden' aria-label='Mobile navigation'>
                {NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => mobileNavClass(isActive)}>
                            <Icon className='size-4' aria-hidden='true' />
                            <span className='truncate'>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <NewSessionModal />
            <NewProjectModal />
        </div>
    );
};
