import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { credentialApi } from '@/modules/settings/api/api';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

const PRESETS: { id: string; label: string; envVar: string }[] = [
    { id: 'anthropic', label: 'Anthropic API key', envVar: 'ANTHROPIC_API_KEY' },
    { id: 'anthropic-base', label: 'Anthropic base URL', envVar: 'ANTHROPIC_BASE_URL' },
    { id: 'anthropic-token', label: 'Anthropic auth token', envVar: 'ANTHROPIC_AUTH_TOKEN' },
    { id: 'openai', label: 'OpenAI API key', envVar: 'OPENAI_API_KEY' },
    { id: 'openai-base', label: 'OpenAI base URL', envVar: 'OPENAI_BASE_URL' },
    { id: 'gemini', label: 'Gemini API key', envVar: 'GEMINI_API_KEY' },
    { id: 'git', label: 'Git token', envVar: 'GIT_TOKEN' },
    { id: 'custom', label: 'Custom env var…', envVar: '' }
];

export const CredentialForm = ({ onCreated }: { onCreated: () => void }) => {
    const [presetId, setPresetId] = useState('anthropic');
    const [envVar, setEnvVar] = useState('ANTHROPIC_API_KEY');
    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [reveal, setReveal] = useState(false);
    const [busy, setBusy] = useState(false);

    const onPreset = (id: string) => {
        setPresetId(id);
        const preset = PRESETS.find((p) => p.id === id);
        setEnvVar(id === 'custom' ? '' : preset?.envVar ?? '');
    };

    const submit = async () => {
        const cleanEnv = envVar.trim();
        if(!value.trim() || !label.trim() || !cleanEnv) return;
        setBusy(true);
        try{
            await credentialApi.create({
                provider: presetId === 'custom' ? 'custom' : presetId.split('-')[0],
                label: label.trim(),
                envVar: cleanEnv,
                secret: value.trim()
            });
            setLabel('');
            setValue('');
            onCreated();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-3'>
            <span className='mono-label text-muted/70'>Add credential or setting</span>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <select className={input} value={presetId} onChange={(e) => onPreset(e.target.value)}>
                    {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <input className={`${input} font-mono`} value={envVar} onChange={(e) => setEnvVar(e.target.value.toUpperCase())} placeholder='ENV_VAR_NAME' />
            </div>
            <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder='Label (e.g. Personal)' />
            <div className='flex items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2 focus-within:border-accent'>
                <input
                    type={reveal ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder='Value (key, token, or URL)'
                    className='w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted'
                />
                <button type='button' onClick={() => setReveal((r) => !r)} className='text-muted transition-colors hover:text-foreground' aria-label={reveal ? 'Hide' : 'Show'}>
                    {reveal ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </button>
            </div>
            <button
                type='button'
                onClick={submit}
                disabled={busy}
                className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
            >
                {busy ? 'Saving…' : 'Save'}
            </button>
        </div>
    );
};
