import { KeyRound, Lock, MoreHorizontal, Trash2 } from 'lucide-react';
import { Dropdown } from '@heroui/react';
import { credentialApi } from '@/modules/settings/api/api';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useSession } from '@/shared/hooks/routing/useSession';
import type { CredentialView } from '@hangar/contracts/modules/credential/domain';

interface Props{
    credentials: CredentialView[];
    onChanged: () => void;
}

const addedAgo = (value: string): string => {
    const elapsed = Math.max(0, Date.now() - Date.parse(value));
    const minutes = Math.floor(elapsed / 60_000);
    if(minutes < 1) return 'Added just now';
    if(minutes < 60) return `Added ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if(hours < 24) return `Added ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Added ${days}d ago`;
};

export const CredentialList = ({ credentials, onChanged }: Props) => {
    const { user } = useSession();
    const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

    const remove = async (id: number) => {
        await credentialApi.remove(id);
        onChanged();
    };

    if(credentials.length === 0){
        return (
            <EmptyState
                icon={KeyRound}
                title='No environment variables yet'
                description='Add a name and value above — it gets encrypted at rest and injected into every new agent session.'
            />
        );
    }

    return (
        <ul className='flex flex-col gap-3'>
            {credentials.map((credential) => (
                <li
                    key={credential.id}
                    className='flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-4 py-3 transition-colors hover:border-foreground/20'
                >
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='grid size-9 shrink-0 place-items-center rounded-full border border-hairline text-muted' aria-hidden='true'>
                            <Lock className='size-4' />
                        </span>
                        <span className='min-w-0 truncate font-mono text-sm font-medium text-foreground'>{credential.name}</span>
                    </div>
                    <div className='flex shrink-0 items-center gap-3'>
                        <span className='hidden text-xs text-muted sm:inline'>{addedAgo(credential.createdAt)}</span>
                        <span className='grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/10 text-[11px] font-medium text-foreground' aria-hidden='true'>
                            {user?.avatarUrl ? <img src={user.avatarUrl} alt='' className='size-full object-cover' /> : initial}
                        </span>
                        <Dropdown.Root>
                            <Dropdown.Trigger
                                className='grid size-7 shrink-0 place-items-center rounded-md text-muted outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground data-[open]:bg-foreground/[0.05]'
                                aria-label={`Options for ${credential.name}`}
                            >
                                <MoreHorizontal className='size-4' aria-hidden='true' />
                            </Dropdown.Trigger>
                            <Dropdown.Popover placement='bottom end'>
                                <Dropdown.Menu>
                                    <Dropdown.Item id='delete' onAction={() => void remove(credential.id)}>
                                        <Trash2 className='size-4 text-danger' aria-hidden='true' />
                                        Delete
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </div>
                </li>
            ))}
        </ul>
    );
};
