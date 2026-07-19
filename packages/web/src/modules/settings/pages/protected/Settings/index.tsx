import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@heroui/react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useCredentials } from '@/modules/settings/hooks/useCredentials';
import { CredentialForm } from '@/modules/settings/components/CredentialForm';
import { CredentialList } from '@/modules/settings/components/CredentialList';

const SettingsPage = () => {
    const { credentials, refresh } = useCredentials();
    const [open, setOpen] = useState(false);

    return (
        <AppShell>
            <Canvas>
                <Row>
                    <PageHeader
                        title='Environment variables'
                        description='Add any name and value needed by your agents. Values are encrypted at rest, injected when a new agent session starts, and never shown again after saving.'
                        actions={(
                            <button
                                type='button'
                                onClick={() => setOpen(true)}
                                className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                            >
                                <Plus className='size-3.5' aria-hidden='true' />
                                New variable
                            </button>
                        )}
                    />
                </Row>
                <Row grow className='mt-2'>
                    <CredentialList credentials={credentials} onChanged={refresh} />
                </Row>
            </Canvas>

            <Modal.Root isOpen={open} onOpenChange={setOpen}>
                <Modal.Backdrop>
                    <Modal.Container>
                        <Modal.Dialog>
                            <Modal.Header>
                                <Modal.Heading>New environment variable</Modal.Heading>
                                <Modal.CloseTrigger />
                            </Modal.Header>
                            <Modal.Body>
                                <CredentialForm onCreated={() => { refresh(); setOpen(false); }} />
                            </Modal.Body>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal.Root>
        </AppShell>
    );
};

export default SettingsPage;
