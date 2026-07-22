import { useEffect, useState } from 'react';
import { Modal } from '@heroui/react';

interface Props{
    isOpen: boolean;
    title: string;
    label: string;
    /** Initial input value (e.g. current name when renaming). */
    initialValue?: string;
    confirmLabel?: string;
    placeholder?: string;
    /** Return an error string to keep the modal open and show it; return null/undefined on success. */
    onSubmit: (value: string) => Promise<string | null | void> | string | null | void;
    onClose: () => void;
}

const inputClass = 'w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

/**
 * A tiny single-field prompt modal (name a file, rename an entry). Replaces the native
 * window.prompt with the app's Modal styling. Submits on Enter or the confirm button; keeps itself
 * open and surfaces the message when onSubmit reports an error.
 */
export const PromptModal = ({ isOpen, title, label, initialValue = '', confirmLabel = 'OK', placeholder, onSubmit, onClose }: Props) => {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Reseed when (re)opened for a new target.
    useEffect(() => {
        if(isOpen){ setValue(initialValue); setError(null); setBusy(false); }
    }, [isOpen, initialValue]);

    const submit = async () => {
        const trimmed = value.trim();
        if(!trimmed || busy) return;
        setBusy(true);
        setError(null);
        try{
            const result = await onSubmit(trimmed);
            if(typeof result === 'string'){ setError(result); return; }
            onClose();
        }catch(err){
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        }finally{
            setBusy(false);
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{title}</Modal.Heading>
                            <Modal.CloseTrigger />
                        </Modal.Header>
                        <Modal.Body>
                            <label className='flex flex-col gap-1.5'>
                                <span className='mono-label text-muted/70'>{label}</span>
                                <input
                                    autoFocus
                                    className={inputClass}
                                    value={value}
                                    placeholder={placeholder}
                                    onChange={(event) => setValue(event.target.value)}
                                    onKeyDown={(event) => {
                                        if(event.key === 'Enter'){ event.preventDefault(); void submit(); }
                                    }}
                                />
                            </label>
                            {error && <p role='alert' className='mt-2 text-xs text-danger'>{error}</p>}
                            <div className='mt-4 flex justify-end gap-2'>
                                <button
                                    type='button'
                                    onClick={onClose}
                                    className='rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.05]'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    onClick={() => void submit()}
                                    disabled={!value.trim() || busy}
                                    className='rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                                >
                                    {busy ? 'Working…' : confirmLabel}
                                </button>
                            </div>
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal.Root>
    );
};
