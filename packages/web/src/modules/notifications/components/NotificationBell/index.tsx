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
                className='relative text-muted transition-colors hover:text-foreground'
                aria-label='Notifications'
            >
                <Bell className='size-4' />
                {unread > 0 && (
                    <span className='absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[0.5625rem] font-semibold text-white'>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className='absolute right-0 z-10 mt-2 w-72 rounded-xl border border-foreground/10 bg-background p-2 shadow-lg'>
                    {items.length === 0
                        ? <p className='px-2 py-3 text-xs text-muted'>No notifications.</p>
                        : items.slice(0, 12).map((n) => (
                            <Link
                                key={n.id}
                                to={`/sessions/${n.sessionId}`}
                                onClick={() => setOpen(false)}
                                className='block rounded-lg px-2 py-2 text-xs text-foreground transition-colors hover:bg-foreground/5'
                            >
                                {n.message}
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
};
