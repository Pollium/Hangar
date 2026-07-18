import { Button } from '@heroui/react';
import { AppShell } from '@/modules/sessions/components/AppShell';
import { useSession } from '@/shared/hooks/routing/useSession';
import { useAuthStore } from '@/modules/auth/store/auth';
import { useCredentials } from '@/modules/settings/hooks/useCredentials';
import { CredentialForm } from '@/modules/settings/components/CredentialForm';
import { CredentialList } from '@/modules/settings/components/CredentialList';

const SettingsPage = () => {
    const { user } = useSession();
    const clear = useAuthStore((state) => state.clear);
    const { credentials, refresh } = useCredentials();

    return (
        <AppShell>
            <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto p-8'>
                <div className='flex items-center justify-between'>
                    <div className='flex flex-col'>
                        <h1 className='text-lg font-semibold text-foreground'>Settings</h1>
                        {user && <span className='text-xs text-muted'>{user.email}</span>}
                    </div>
                    <Button size='sm' variant='secondary' onPress={clear}>Sign out</Button>
                </div>

                <section className='flex flex-col gap-3'>
                    <h2 className='text-sm font-medium text-foreground'>Credentials</h2>
                    <p className='text-xs text-muted'>
                        API keys are encrypted at rest and injected into your sandboxes at session start.
                        They are never shown again after saving.
                    </p>
                    <CredentialForm onCreated={refresh} />
                    <CredentialList credentials={credentials} onChanged={refresh} />
                </section>
            </div>
        </AppShell>
    );
};

export default SettingsPage;
