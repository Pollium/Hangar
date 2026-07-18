import { Button } from '@heroui/react';
import { projectApi } from '@/modules/projects/api/api';
import { SandboxControls } from '@/modules/projects/components/SandboxControls';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

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
        return <p className='text-sm text-muted'>No projects yet. Create one to get started.</p>;
    }

    return (
        <ul className='flex flex-col gap-2'>
            {projects.map((project) => (
                <li key={project.id} className='flex items-center justify-between rounded-xl border border-foreground/10 px-4 py-3'>
                    <div className='flex min-w-0 flex-col'>
                        <span className='truncate text-sm font-medium text-foreground'>{project.name}</span>
                        <span className='truncate text-xs text-muted'>{project.repoUrl ?? 'no repo'} · {project.defaultCli}</span>
                    </div>
                    <div className='flex items-center gap-3'>
                        <SandboxControls projectId={project.id} />
                        <Button size='sm' variant='secondary' onPress={() => remove(project.id)}>Delete</Button>
                    </div>
                </li>
            ))}
        </ul>
    );
};
