import { useState, useEffect, useCallback } from 'react';
import { sandboxApi } from '@/modules/projects/api/api';
import type { Sandbox, SandboxStatus } from '@cloud-code/contracts/modules/sandbox/domain';

const btn = 'rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60';

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

    useEffect(() => { void load(); }, [load]);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try{ await action(); await load(); }finally{ setBusy(false); }
    };

    return (
        <div className='flex items-center gap-2'>
            <span className='mono-label text-muted/70'>{status}</span>
            {status === 'none' || status === 'error'
                ? <button className={btn} disabled={busy} onClick={() => run(() => sandboxApi.provision(projectId))}>Provision</button>
                : status === 'running'
                    ? <button className={btn} disabled={busy} onClick={() => run(() => sandboxApi.stop(projectId))}>Stop</button>
                    : <button className={btn} disabled={busy} onClick={() => run(() => sandboxApi.start(projectId))}>Start</button>}
        </div>
    );
};
