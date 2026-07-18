import { useState } from 'react';
import { Button } from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
import { credentialApi } from '@/modules/settings/api/api';

interface Props{
    onCreated: () => void;
}

// Preset → default env var. "Custom" lets the user type any env var (base URLs, extra tokens).
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

export const CredentialForm = ({ onCreated }: Props) => {
    const [presetId, setPresetId] = useState('anthropic');
    const [envVar, setEnvVar] = useState('ANTHROPIC_API_KEY');
    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [reveal, setReveal] = useState(false);
    const [busy, setBusy] = useState(false);

    const onPreset = (id: string) => {
        setPresetId(id);
        const preset = PRESETS.find((p) => p.id === id);
        if(preset && preset.envVar) setEnvVar(preset.envVar);
        if(id === 'custom') setEnvVar('');
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
        <div className='flex flex-col gap-3 rounded-xl border border-foreground/10 p-4'>
            <p className='text-sm font-medium text-foreground'>Add credential or setting</p>

            <select
                value={presetId}
                onChange={(e) => onPreset(e.target.value)}
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none'
            >
                {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>

            <input
                value={envVar}
                onChange={(e) => setEnvVar(e.target.value.toUpperCase())}
                placeholder='ENV_VAR_NAME'
                className='rounded-lg bg-foreground/5 px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted'
            />

            <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='Label (e.g. Personal)'
                className='rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted'
            />

            <div className='flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-2'>
                <input
                    type={reveal ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder='Value (key, token, or URL)'
                    className='w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted'
                />
                <button
                    type='button'
                    onClick={() => setReveal((r) => !r)}
                    className='text-muted transition-colors hover:text-foreground'
                    aria-label={reveal ? 'Hide' : 'Show'}
                >
                    {reveal ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                </button>
            </div>

            <Button onPress={submit} isPending={busy} className='bg-foreground text-background'>Save</Button>
        </div>
    );
};
