import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/modules/notifications/hooks/useNotifications';

export const NotificationBell = () => {
    const { items, unread, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if(next && unread > 0) void markAllRead();
    };

    return (
        <div className='relative'>
            <button
                type='button'
                onClick={toggle}
                className='relative grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                aria-label='Notifications'
            >
                <Bell className='size-4' />
                {unread > 0 && (
                    <span className='absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-[0.5625rem] font-semibold text-accent-foreground'>
                        {unread > 9 ? '9' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className='absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl'>
                    {items.length === 0
                        ? <p className='px-4 py-4 text-xs text-muted'>No notifications.</p>
                        : items.slice(0, 12).map((n) => (
                            <Link
                                key={n.id}
                                to={`/sessions/${n.sessionId}`}
                                onClick={() => setOpen(false)}
                                className='block border-b border-hairline px-4 py-3 text-xs text-foreground transition-colors last:border-b-0 hover:bg-foreground/[0.03]'
                            >
                                {n.message}
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
};
