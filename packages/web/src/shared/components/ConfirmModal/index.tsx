import { useState } from 'react';
import { Modal } from '@heroui/react';

interface Props{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    /** When true, the confirm button is styled as a destructive action. */
    danger?: boolean;
    onConfirm: () => Promise<string | null | void> | string | null | void;
    onClose: () => void;
}

/**
 * A yes/no confirmation modal replacing native window.confirm. Awaits onConfirm; if it returns an
 * error string the modal stays open and shows it, otherwise it closes.
 */
export const ConfirmModal = ({ isOpen, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }: Props) => {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        if(busy) return;
        setBusy(true);
        setError(null);
        try{
            const result = await onConfirm();
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
                            <p className='text-sm text-foreground'>{message}</p>
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
                                    onClick={() => void confirm()}
                                    disabled={busy}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                                        danger
                                            ? 'bg-danger text-white hover:bg-danger/90'
                                            : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                                    }`}
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
