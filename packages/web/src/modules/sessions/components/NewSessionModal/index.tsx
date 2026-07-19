import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListBox, ListBoxItem, Modal, Select } from '@heroui/react';
import { sessionApi } from '@/modules/sessions/api/api';
import { cliApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import { useNewSessionModalStore } from '@/modules/sessions/store/newSessionModal';
import type { CliDescriptor } from '@cloud-code/contracts/modules/cli/domain';

const input = 'flex h-10 items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-accent data-[open]:border-accent';
const textInput = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

export const NewSessionModal = () => {
    const navigate = useNavigate();
    const isOpen = useNewSessionModalStore((state) => state.isOpen);
    const close = useNewSessionModalStore((state) => state.close);
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);

    const [clis, setClis] = useState<CliDescriptor[]>([]);
    const [cliType, setCliType] = useState('claude-code');
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if(!isOpen) return;
        void cliApi.list().then(setClis);
    }, [isOpen]);

    const handleOpenChange = (open: boolean) => {
        if(open) return;
        close();
        setTitle('');
        setBusy(false);
    };

    const create = async () => {
        if(!activeProjectId) return;
        setBusy(true);
        try{
            const session = await sessionApi.create({ projectId: activeProjectId, cliType, title: title.trim() || undefined });
            handleOpenChange(false);
            navigate(`/sessions/${session.id}`);
        }finally{
            setBusy(false);
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>New session</Modal.Heading>
                            <Modal.CloseTrigger />
                        </Modal.Header>
                        <Modal.Body>
                            <div className='flex flex-col gap-4'>
                                <label className='flex flex-col gap-1.5'>
                                    <span className='mono-label text-muted/70'>CLI</span>
                                    <Select.Root
                                        selectedKey={cliType}
                                        onSelectionChange={(key) => setCliType(String(key))}
                                    >
                                        <Select.Trigger className={input}>
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
                                </label>
                                <label className='flex flex-col gap-1.5'>
                                    <span className='mono-label text-muted/70'>Title</span>
                                    <input
                                        className={textInput}
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder='What are you working on?'
                                    />
                                </label>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <button
                                type='button'
                                onClick={create}
                                disabled={busy}
                                className='self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60'
                            >
                                {busy ? 'Starting…' : 'Start session'}
                            </button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal.Root>
    );
};
