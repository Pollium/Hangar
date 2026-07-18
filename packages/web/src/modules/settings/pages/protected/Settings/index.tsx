import { AppShell } from '@/modules/sessions/components/AppShell';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useCredentials } from '@/modules/settings/hooks/useCredentials';
import { CredentialForm } from '@/modules/settings/components/CredentialForm';
import { CredentialList } from '@/modules/settings/components/CredentialList';

const SettingsPage = () => {
    const { credentials, refresh } = useCredentials();

    return (
        <AppShell title='Settings'>
            <Canvas>
                <Row className='px-8 pt-12 pb-10'>
                    <PageHeader
                        title='Credentials'
                        description='API keys, tokens and base URLs. Encrypted at rest and injected into your sandboxes at session start — never shown again after saving.'
                    />
                </Row>
                <Row className='p-8'>
                    <CredentialForm onCreated={refresh} />
                </Row>
                <Row grow className='p-8'>
                    <CredentialList credentials={credentials} onChanged={refresh} />
                </Row>
            </Canvas>
        </AppShell>
    );
};

export default SettingsPage;
