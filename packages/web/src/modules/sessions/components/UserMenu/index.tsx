import { Dropdown } from '@heroui/react';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@hangar/contracts/modules/user/domain';
import type { Theme } from '@/shared/utils/theme';

interface Props{
    user: User | null;
    theme: Theme;
    onToggleTheme: () => void;
    onSignOut: () => void;
}

export const UserMenu = ({ user, theme, onToggleTheme, onSignOut }: Props) => {
    const navigate = useNavigate();
    const label = user?.fullName || user?.email || '—';
    const initial = label.charAt(0).toUpperCase();

    return (
        <Dropdown.Root>
            <Dropdown.Trigger className='flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-foreground/[0.05] data-[open]:bg-foreground/[0.05]'>
                <span className='grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/10 text-[11px] font-medium text-foreground'>
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt='' className='size-full object-cover' /> : initial}
                </span>
                <span className='hidden max-w-[10rem] truncate text-xs text-muted sm:inline'>{user?.email ?? '—'}</span>
            </Dropdown.Trigger>
            <Dropdown.Popover placement='bottom end'>
                <Dropdown.Menu>
                    <Dropdown.Item id='theme' onAction={onToggleTheme}>
                        {theme === 'dark' ? <Sun className='size-4' aria-hidden='true' /> : <Moon className='size-4' aria-hidden='true' />}
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </Dropdown.Item>
                    <Dropdown.Item id='settings' onAction={() => navigate('/account')}>
                        <Settings className='size-4' aria-hidden='true' />
                        Settings
                    </Dropdown.Item>
                    <Dropdown.Item id='signout' onAction={onSignOut}>
                        <LogOut className='size-4' aria-hidden='true' />
                        Sign out
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};
