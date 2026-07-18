import type { ReactNode, SVGProps } from 'react';
import { useSession } from '@/shared/hooks/routing/useSession';

const HomeIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M5 19V5h6v14zm14 0h-6v-7h6zm0-9h-6V5h6z' />
    </svg>
);

const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m7.46 7.12-2.78 1.15c-.51-1.36-1.58-2.44-2.95-2.94l1.15-2.78c2.1.8 3.77 2.47 4.58 4.57M12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M9.13 4.54l1.17 2.78c-1.38.5-2.47 1.59-2.98 2.97L4.54 9.13c.81-2.11 2.48-3.78 4.59-4.59M4.54 14.87l2.78-1.15c.51 1.38 1.59 2.46 2.97 2.96l-1.17 2.78c-2.1-.81-3.77-2.48-4.58-4.59m10.34 4.59-1.15-2.78c1.37-.51 2.45-1.59 2.95-2.97l2.78 1.17c-.81 2.1-2.48 3.77-4.58 4.58' />
    </svg>
);

const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' {...props}>
        <path d='M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z' />
    </svg>
);

interface NavItemProps{
    icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
    label: string;
    active?: boolean;
}

const NavItem = ({ icon: Icon, label, active = false }: NavItemProps) => (
    <button
        type='button'
        className={`flex h-8 w-full items-center gap-2.5 px-2 text-[0.875rem] transition-colors ${
            active ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
        }`}
    >
        <span className='flex size-6 shrink-0 items-center justify-center'>
            <Icon className='size-[18px]' />
        </span>
        <span className='truncate'>{label}</span>
    </button>
);

interface DashboardLayoutProps{
    children?: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user } = useSession();

    return (
        <div className='flex h-dvh bg-background text-foreground'>
            <aside className='flex w-56 shrink-0 flex-col px-3 pb-3 pt-5'>
                <nav className='flex flex-1 flex-col gap-0.5'>
                    <NavItem icon={HomeIcon} label='Home' active />
                </nav>

                <NavItem icon={SettingsIcon} label='Settings' />
            </aside>

            <div className='flex min-w-0 flex-1 p-2'>
                <div className='flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--dashboard-surface)]'>
                    <header className='flex h-14 shrink-0 items-center justify-between px-6'>
                        <span className='flex items-center gap-1.5 px-1 text-[0.875rem] font-medium text-foreground'>
                            Cloud Code
                            <ChevronDownIcon className='size-4 shrink-0 text-muted' />
                        </span>

                        <div className='group flex items-center'>
                            {user ? (
                                <>
                                    <div className='max-w-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover:max-w-44 group-hover:opacity-100 motion-reduce:transition-none'>
                                        <span className='block whitespace-nowrap pr-2.5 text-[0.875rem] font-medium capitalize text-foreground'>{user.fullName}</span>
                                    </div>
                                    <span className='flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/10 text-xs font-medium text-muted'>
                                        {user.avatarUrl
                                            ? <img src={user.avatarUrl} alt='' className='size-full object-cover' />
                                            : user.fullName.charAt(0).toUpperCase()}
                                    </span>
                                </>
                            ) : (
                                <span className='size-6 shrink-0 animate-pulse rounded-full bg-foreground/10' />
                            )}
                        </div>
                    </header>

                    <main className='flex-1 overflow-y-auto px-4'>{children}</main>
                </div>
            </div>
        </div>
    );
};
