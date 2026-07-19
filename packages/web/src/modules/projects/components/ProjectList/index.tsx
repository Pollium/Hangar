import { FolderGit2, Plus } from 'lucide-react';
import { projectApi } from '@/modules/projects/api/api';
import { SandboxControls } from '@/modules/projects/components/SandboxControls';
import { ProjectInviteLink } from '@/modules/projects/components/ProjectInviteLink';
import { ProjectRepositories } from '@/modules/projects/components/ProjectRepositories';
import { useNewProjectModalStore } from '@/modules/projects/store/newProjectModal';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import type { Project } from '@hangar/contracts/modules/project/domain';

interface Props{
    projects: Project[];
    onChanged: () => void;
}

export const ProjectList = ({ projects, onChanged }: Props) => {
    const remove = async (id: number) => {
        await projectApi.remove(id);
        onChanged();
    };

    if(projects.length === 0){
        return (
            <EmptyState
                icon={FolderGit2}
                title='No projects yet'
                description='Create a project to get a hardened sandbox your sessions can run in.'
                action={(
                    <button
                        type='button'
                        onClick={() => useNewProjectModalStore.getState().open()}
                        className='inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover'
                    >
                        <Plus className='size-3.5' aria-hidden='true' />
                        New project
                    </button>
                )}
            />
        );
    }

    return (
        <ul className='flex flex-col gap-4'>
            {projects.map((project) => (
                <li key={project.id} className='flex flex-col gap-4 rounded-xl border border-hairline p-5'>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex min-w-0 flex-col gap-0.5'>
                            <span className='truncate text-sm font-medium text-foreground'>{project.name}</span>
                            <span className='truncate text-[11px] text-muted/70'>{project.defaultCli}</span>
                        </div>
                        <div className='flex shrink-0 items-center gap-3'>
                            <SandboxControls projectId={project.id} />
                            <button
                                type='button'
                                onClick={() => remove(project.id)}
                                className='rounded-md border border-hairline px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/10'
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <ProjectInviteLink projectId={project.id} inviteToken={project.inviteToken} onRotated={onChanged} />
                    <ProjectRepositories projectId={project.id} />
                </li>
            ))}
        </ul>
    );
};
