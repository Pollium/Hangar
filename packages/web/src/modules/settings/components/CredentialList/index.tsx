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
        <ul className='overflow-hidden rounded-xl border border-hairline'>
            {credentials.map((credential) => (
                <li key={credential.id} className='flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0'>
                    <div className='flex min-w-0 flex-col gap-0.5'>
                        <span className='truncate text-sm font-medium text-foreground'>{credential.label}</span>
                        <span className='truncate font-mono text-[11px] text-muted/70'>{credential.envVar}</span>
                    </div>
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
