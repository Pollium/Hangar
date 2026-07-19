import { Combobox } from '@/shared/components/ui/Combobox';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

const trigger = 'flex h-8 w-52 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.05] focus-within:bg-foreground/[0.05]';

export const ProjectSwitcher = () => {
    const { projects } = useProjects();
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
    const active = projects.find((project) => project.id === activeProjectId);

    if(!active) return null;

    return (
        <Combobox
            items={projects.map((project) => ({ id: String(project.id), label: project.name }))}
            value={String(active.id)}
            onChange={(id) => setActiveProject(Number(id))}
            placeholder='Search projects…'
            ariaLabel='Switch project'
            groupClassName={trigger}
        />
    );
};
