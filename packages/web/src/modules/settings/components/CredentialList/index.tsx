import { Button } from '@heroui/react';
import { credentialApi } from '@/modules/settings/api/api';
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
        return <p className='text-sm text-muted'>No credentials yet.</p>;
    }

    return (
        <ul className='flex flex-col gap-2'>
            {credentials.map((credential) => (
                <li key={credential.id} className='flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3'>
                    <div className='flex min-w-0 flex-col'>
                        <span className='truncate text-sm font-medium text-foreground'>{credential.label}</span>
                        <span className='truncate text-xs text-muted'>{credential.provider} · {credential.envVar}</span>
                    </div>
                    <Button size='sm' variant='secondary' onPress={() => remove(credential.id)}>Delete</Button>
                </li>
            ))}
        </ul>
    );
};
