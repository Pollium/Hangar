import { useState } from 'react';
import { ProjectForm } from '@/modules/projects/components/ProjectForm';
import { projectApi } from '@/modules/projects/api/api';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

const input = 'rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent placeholder:text-muted';

const extractToken = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/\/invites\/([^/?#]+)/);
    return match ? match[1] : trimmed;
};

const OnboardingPage = () => {
    const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
    const [inviteInput, setInviteInput] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    // A hard navigation here (instead of react-router's navigate) guarantees every guard and
    // hook on the next page starts from a clean fetch — this is a once-per-account transition,
    // not a hot path, so paying for a full reload buys certainty over a SPA-navigation race.
    const enter = (project: Project) => {
        setActiveProject(project.id);
        window.location.href = '/';
    };

    const join = async () => {
        const token = extractToken(inviteInput);
        if(!token) return;
        setJoining(true);
        setJoinError(null);
        try{
            enter(await projectApi.joinInvite(token));
        }catch{
            setJoinError('That invite link is not valid.');
        }finally{
            setJoining(false);
        }
    };

    return (
        <div className='flex min-h-dvh items-center justify-center bg-background px-4 py-12 text-foreground'>
            <div className='flex w-full max-w-md flex-col gap-8'>
                <div className='flex flex-col gap-1'>
                    <h1 className='text-lg font-semibold'>Create your first project</h1>
                    <p className='text-sm text-muted'>
                        A project is a repo and its hardened sandbox. Every session you start runs inside one.
                    </p>
                </div>

                <ProjectForm onCreated={enter} />

                <div className='flex items-center gap-3 text-xs text-muted'>
                    <div className='h-px flex-1 bg-hairline' />
                    or join with an invite link
                    <div className='h-px flex-1 bg-hairline' />
                </div>

                <div className='flex flex-col gap-2'>
                    <input
                        className={input}
                        value={inviteInput}
                        onChange={(event) => setInviteInput(event.target.value)}
                        placeholder='Paste an invite link'
                    />
                    {joinError && <p className='text-xs text-danger'>{joinError}</p>}
                    <button
                        type='button'
                        onClick={join}
                        disabled={joining || !inviteInput.trim()}
                        className='self-start rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.04] disabled:opacity-60'
                    >
                        {joining ? 'Joining…' : 'Join project'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
