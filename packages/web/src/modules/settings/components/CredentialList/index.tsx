import { KeyRound, Lock, MoreHorizontal, Trash2 } from 'lucide-react';
import { Dropdown } from '@heroui/react';
import { credentialApi } from '@/modules/settings/api/api';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { relativeTime } from '@/shared/utils/time';
import { useSession } from '@/shared/hooks/routing/useSession';
import type { CredentialView } from '@hangar/contracts/modules/credential/domain';

interface Props{
    credentials: CredentialView[];
    onChanged: () => void;
}

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
        <div className='overflow-hidden rounded-xl border border-hairline'>
            <table className='w-full border-collapse text-sm'>
                <thead>
                    <tr className='border-b border-hairline bg-foreground/[0.02] text-left'>
                        <th scope='col' className='px-4 py-2.5 font-medium text-muted'>Name</th>
                        <th scope='col' className='hidden px-4 py-2.5 font-medium text-muted sm:table-cell'>Added</th>
                        <th scope='col' className='hidden px-4 py-2.5 font-medium text-muted sm:table-cell'>Owner</th>
                        <th scope='col' className='w-12 px-4 py-2.5'><span className='sr-only'>Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {credentials.map((credential) => (
                        <tr key={credential.id} className='border-b border-hairline transition-colors last:border-b-0 hover:bg-foreground/[0.02]'>
                            <td className='px-4 py-2.5'>
                                <div className='flex min-w-0 items-center gap-2.5'>
                                    <Lock className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
                                    <span className='min-w-0 truncate font-mono font-medium text-foreground'>{credential.name}</span>
                                </div>
                            </td>
                            <td className='hidden whitespace-nowrap px-4 py-2.5 text-xs text-muted sm:table-cell'>{relativeTime(credential.createdAt)}</td>
                            <td className='hidden px-4 py-2.5 sm:table-cell'>
                                <span className='grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/10 text-[11px] font-medium text-foreground' aria-hidden='true'>
                                    {user?.avatarUrl ? <img src={user.avatarUrl} alt='' className='size-full object-cover' /> : initial}
                                </span>
                            </td>
                            <td className='px-4 py-2.5 text-right'>
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
