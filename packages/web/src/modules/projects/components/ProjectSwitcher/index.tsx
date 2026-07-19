import { Dropdown } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

export const ProjectSwitcher = () => {
    const { projects } = useProjects();
    const activeProjectId = useActiveProjectStore((state) => state.activeProjectId);
    const setActiveProject = useActiveProjectStore((state) => state.setActiveProject);
    const active = projects.find((project) => project.id === activeProjectId);

    if(!active) return null;

    return (
        <Dropdown.Root>
            <Dropdown.Trigger className='z-10 flex max-w-[26%] items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-sm font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.05] data-[open]:bg-foreground/[0.05]'>
                <span className='truncate'>{active.name}</span>
                <ChevronDown className='size-3.5 shrink-0 text-muted' aria-hidden='true' />
            </Dropdown.Trigger>
            <Dropdown.Popover placement='bottom start'>
                <Dropdown.Menu
                    selectionMode='single'
                    disallowEmptySelection
                    selectedKeys={new Set([active.id])}
                    onSelectionChange={(keys) => {
                        const [key] = [...keys];
                        if(key !== undefined) setActiveProject(Number(key));
                    }}
                >
                    {projects.map((project) => (
                        <Dropdown.Item key={project.id} id={project.id}>{project.name}</Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};
