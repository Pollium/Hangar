import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LayoutGrid, FolderGit2, Settings, Terminal, Sun, Moon, LogOut, Plus } from 'lucide-react';
import { SessionSidebar } from '@/modules/sessions/components/SessionSidebar';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { useSession } from '@/shared/hooks/routing/useSession';
import { useAuthStore } from '@/modules/auth/store/auth';
import { applyTheme } from '@/shared/utils/theme';
import type { Theme } from '@/shared/utils/theme';

const NAV = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard', label: 'Fleet', icon: LayoutGrid },
    { to: '/projects', label: 'Projects', icon: FolderGit2 },
    { to: '/settings', label: 'Settings', icon: Settings }
];

const navClass = (active: boolean): string =>
    `mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors ${
        active ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
    }`;

interface Props{
    title?: string;
    headerActions?: ReactNode;
    children: ReactNode;
    /** Full-bleed content (terminal) skips the scroll padding. */
    bleed?: boolean;
}

export const AppShell = ({ title, headerActions, children, bleed = false }: Props) => {
    const navigate = useNavigate();
    const { user } = useSession();
    const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();
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
            <aside className='flex w-60 shrink-0 flex-col border-r border-hairline'>
                <div className='flex h-14 items-center gap-2 px-4'>
                    <Terminal className='size-5 shrink-0 text-accent' />
                    <span className='text-[15px] font-semibold tracking-tight'>Cloud Code</span>
                </div>

                <nav className='flex flex-col gap-0.5 pt-1'>
                    {NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
                                <span className='flex size-5 items-center justify-center'><Icon className='size-4' /></span>
                                <span className='truncate'>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className='flex items-center justify-between px-4 pt-5 pb-1.5'>
                    <span className='mono-label text-muted/60'>Sessions</span>
                    <button
                        type='button'
                        onClick={() => navigate('/sessions/new')}
                        className='grid size-5 place-items-center rounded text-muted transition-colors hover:text-accent'
                        aria-label='New session'
                    >
                        <Plus className='size-3.5' />
                    </button>
                </div>

                <SessionSidebar />

                <div className='mt-auto flex items-center gap-2.5 border-t border-hairline px-4 py-3'>
                    <span className='grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[10px] font-semibold text-accent'>
                        {initials}
                    </span>
                    <span className='min-w-0 flex-1 truncate text-xs text-muted'>{user?.email ?? '—'}</span>
                    <button type='button' onClick={toggleTheme} aria-label='Toggle theme' className='text-muted transition-colors hover:text-foreground'>
                        {theme === 'dark' ? <Sun className='size-4' /> : <Moon className='size-4' />}
                    </button>
                    <button type='button' onClick={signOut} aria-label='Sign out' className='text-muted transition-colors hover:text-foreground'>
                        <LogOut className='size-4' />
                    </button>
                </div>
            </aside>

            <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
                <header className='flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-6'>
                    <span className='text-sm font-medium text-foreground'>{title ?? ''}</span>
                    <div className='min-w-0 flex-1' />
                    {headerActions}
                    <NotificationBell />
                </header>
                <main className='min-h-0 flex-1 overflow-hidden'>
                    {bleed ? children : <div className='h-full overflow-y-auto bg-blueprint'>{children}</div>}
                </main>
            </div>
        </div>
    );
};
