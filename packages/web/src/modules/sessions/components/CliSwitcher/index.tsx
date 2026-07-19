import { useEffect, useState } from 'react';
import { ListBox, ListBoxItem, Select } from '@heroui/react';
import { cliApi } from '@/modules/projects/api/api';
import { sessionApi } from '@/modules/sessions/api/api';
import { useSessionsStore } from '@/modules/sessions/store/sessions';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';

const trigger = 'flex h-8 items-center justify-between gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-xs text-foreground outline-none transition-colors focus:border-accent data-[open]:border-accent disabled:opacity-60';

export const CliSwitcher = ({ sessionId }: { sessionId: number }) => {
    const cliType = useSessionsStore((state) => state.sessions.find((session) => session.id === sessionId)?.cliType);
    const upsert = useSessionsStore((state) => state.upsert);
    const [clis, setClis] = useState<CliDescriptor[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void cliApi.list().then(setClis).catch(() => setClis([]));
    }, []);

    const switchTo = async (next: string) => {
        if(!cliType || next === cliType || busy) return;
        const confirmed = window.confirm(
            'Switch the CLI for this session? The running process will be stopped and restarted with the new CLI.'
        );
        if(!confirmed) return;

        setBusy(true);
        try{
            const updated = await sessionApi.switchCli(sessionId, next);
            upsert(updated);
        }catch{
            window.alert('The CLI could not be switched. Please try again.');
        }finally{
            setBusy(false);
        }
    };

    if(!cliType || clis.length === 0) return null;

    return (
        <Select.Root
            selectedKey={cliType}
            onSelectionChange={(key) => void switchTo(String(key))}
            isDisabled={busy}
        >
            <Select.Trigger className={trigger} aria-label='Session CLI'>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    {clis.map((cli) => (
                        <ListBoxItem key={cli.id} id={cli.id}>{cli.label}</ListBoxItem>
                    ))}
                </ListBox>
            </Select.Popover>
        </Select.Root>
    );
};
