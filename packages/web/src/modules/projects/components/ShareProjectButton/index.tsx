import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ProjectInviteLink } from '@/modules/projects/components/ProjectInviteLink';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

export const ShareProjectButton = () => {
    const [open, setOpen] = useState(false);
    const { projects, refresh } = useProjects();
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const project = projects.find((item) => item.id === activeProjectId);

    if(!project) return null;

    return (
        <div className='relative'>
            <button
                type='button'
                onClick={() => setOpen((current) => !current)}
                className='grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                aria-label='Share project'
            >
                <Share2 className='size-4' />
            </button>

            {open && (
                <div className='absolute right-0 z-20 mt-2 w-80 rounded-xl border border-hairline bg-surface p-4 shadow-xl'>
                    <p className='mb-3 text-sm font-medium text-foreground'>Invite to {project.name}</p>
                    <ProjectInviteLink projectId={project.id} inviteToken={project.inviteToken} onRotated={refresh} />
                </div>
            )}
        </div>
    );
};
