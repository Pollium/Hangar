import { useState } from 'react';
import { Button } from '@heroui/react';
import { credentialApi } from '@/modules/settings/api/api';

interface Props{
    onCreated: () => void;
}

// provider → suggested env var, so users don't have to remember the exact name
const PROVIDERS: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
    git: 'GIT_TOKEN'
};

export const CredentialForm = ({ onCreated }: Props) => {
    const [provider, setProvider] = useState('anthropic');
    const [label, setLabel] = useState('');
    const [secret, setSecret] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if(!secret.trim() || !label.trim()) return;
        setBusy(true);
        try{
            await credentialApi.create({
                provider,
                label: label.trim(),
                envVar: PROVIDERS[provider] ?? 'API_KEY',
                secret: secret.trim()
            });
            setLabel('');
            setSecret('');
            onCreated();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3 rounded-xl border border-foreground/10 p-4'>
            <p className='text-sm font-medium text-foreground'>Add credential</p>
            <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none'
            >
                {Object.keys(PROVIDERS).map((p) => <option key={p} value={p}>{p} → {PROVIDERS[p]}</option>)}
            </select>
            <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='Label (e.g. Personal)'
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted'
            />
            <input
                type='password'
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder='Secret (sent once, never shown again)'
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted'
            />
            <Button onPress={submit} isPending={busy} className='bg-foreground text-background'>Save credential</Button>
        </div>
    );
};
