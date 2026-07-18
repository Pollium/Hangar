import { useState, useEffect, useCallback } from 'react';
import { Button } from '@heroui/react';
import { sandboxApi } from '@/modules/projects/api/api';
import type { Sandbox, SandboxStatus } from '@cloud-code/contracts/modules/sandbox/domain';

export const SandboxControls = ({ projectId }: { projectId: number }) => {
    const [status, setStatus] = useState<SandboxStatus | 'none'>('none');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try{
            const sandbox: Sandbox = await sandboxApi.get(projectId);
            setStatus(sandbox.status);
        }catch{
            setStatus('none');
        }
    }, [projectId]);

    useEffect(() => {
        void load();
    }, [load]);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try{
            await action();
            await load();
        }finally{
            setBusy(false);
        }
    };

    return (
        <div className='flex items-center gap-2'>
            <span className='text-xs text-muted'>sandbox: {status}</span>
            {status === 'none' || status === 'error'
                ? <Button size='sm' isPending={busy} onPress={() => run(() => sandboxApi.provision(projectId))}>Provision</Button>
                : status === 'running'
                    ? <Button size='sm' variant='secondary' isPending={busy} onPress={() => run(() => sandboxApi.stop(projectId))}>Stop</Button>
                    : <Button size='sm' isPending={busy} onPress={() => run(() => sandboxApi.start(projectId))}>Start</Button>}
        </div>
    );
};
