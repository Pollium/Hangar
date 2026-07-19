import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { credentialApi } from '@/modules/settings/api/api';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';
const validName = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const CredentialForm = ({ onCreated }: { onCreated: () => void }) => {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [reveal, setReveal] = useState(false);
    const [busy, setBusy] = useState(false);

    const cleanName = name.trim();
    const nameIsValid = validName.test(cleanName);
    const canSubmit = nameIsValid && value.length > 0 && !busy;

    const submit = async () => {
        if(!canSubmit) return;
        setBusy(true);
        try{
            // Values are intentionally not trimmed: spaces and '=' are valid secret content.
            await credentialApi.create({ name: cleanName, value });
            setName('');
            setValue('');
            onCreated();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <label className='flex flex-col gap-1.5'>
                    <span className='text-xs font-medium text-muted'>Name</span>
                    <input
                        className={input}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder='EXAMPLE_API_KEY'
                        autoCapitalize='none'
                        autoComplete='off'
                        spellCheck={false}
                        aria-invalid={cleanName.length > 0 && !nameIsValid}
                    />
                </label>
                <label className='flex flex-col gap-1.5'>
                    <span className='text-xs font-medium text-muted'>Value</span>
                    <div className='flex items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2 focus-within:border-accent'>
                        <input
                            type={reveal ? 'text' : 'password'}
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            placeholder='Value'
                            autoComplete='off'
                            className='w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted'
                        />
                        <button type='button' onClick={() => setReveal((current) => !current)} className='text-muted transition-colors hover:text-foreground' aria-label={reveal ? 'Hide' : 'Show'}>
                            {reveal ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                        </button>
                    </div>
                </label>
            </div>
            {cleanName.length > 0 && !nameIsValid && (
                <p className='text-xs text-danger'>Use letters or underscore first, then letters, numbers or underscores.</p>
            )}
            <button
                type='button'
                onClick={submit}
                disabled={!canSubmit}
                className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
            >
                {busy ? 'Saving…' : 'Save variable'}
            </button>
        </div>
    );
};
