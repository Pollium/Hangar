import { KeyRound } from 'lucide-react';
import { credentialApi } from '@/modules/settings/api/api';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { CredentialView } from '@cloud-code/contracts/modules/credential/domain';

interface Props{
    credentials: CredentialView[];
    onChanged: () => void;
}

export const CredentialList = ({ credentials, onChanged }: Props) => {
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
        <ul className='overflow-hidden rounded-xl border border-hairline'>
            {credentials.map((credential) => (
                <li key={credential.id} className='flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0'>
                    <span className='min-w-0 truncate text-sm font-medium text-foreground'>{credential.name}</span>
                    <button
                        type='button'
                        onClick={() => remove(credential.id)}
                        className='shrink-0 rounded-md border border-hairline px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/10'
                    >
                        Delete
                    </button>
                </li>
            ))}
        </ul>
    );
};
