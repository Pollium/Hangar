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
        return <p className='text-sm text-muted'>No projects yet. Create one above.</p>;
    }

    return (
        <ul className='overflow-hidden rounded-xl border border-hairline'>
            {projects.map((project) => (
                <li key={project.id} className='flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0'>
                    <div className='flex min-w-0 flex-col gap-0.5'>
                        <span className='truncate text-sm font-medium text-foreground'>{project.name}</span>
                        <span className='truncate font-mono text-[11px] text-muted/70'>{project.repoUrl ?? 'no repo'} · {project.defaultCli}</span>
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
                </li>
            ))}
        </ul>
    );
};
