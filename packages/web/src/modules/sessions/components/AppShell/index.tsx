import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Settings, FolderGit2 } from 'lucide-react';
import { SessionSidebar } from '@/modules/sessions/components/SessionSidebar';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';

/** Two-pane app frame: persistent session sidebar on the left, routed content on the right. */
export const AppShell = ({ children }: { children: ReactNode }) => (
    <div className='flex h-dvh bg-background text-foreground'>
        <div className='flex w-64 shrink-0 flex-col border-r border-foreground/5'>
            <div className='flex items-center justify-between px-4 pt-4'>
                <Link to='/' className='text-sm font-semibold text-foreground'>Cloud Code</Link>
                <div className='flex items-center gap-3'>
                    <NotificationBell />
                    <Link to='/projects' className='text-muted transition-colors hover:text-foreground' aria-label='Projects'>
                        <FolderGit2 className='size-4' />
                    </Link>
                    <Link to='/settings' className='text-muted transition-colors hover:text-foreground' aria-label='Settings'>
                        <Settings className='size-4' />
                    </Link>
                </div>
            </div>
            <SessionSidebar />
        </div>

        <main className='flex min-w-0 flex-1 flex-col overflow-hidden'>{children}</main>
    </div>
);
