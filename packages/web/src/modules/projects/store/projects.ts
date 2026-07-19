import { create } from 'zustand';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

interface ProjectsState{
    projects: Project[];
    loaded: boolean;
    setProjects: (projects: Project[]) => void;
    upsert: (project: Project) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
    projects: [],
    loaded: false,
    setProjects: (projects) => set({ projects, loaded: true }),
    upsert: (project) => set((state) => {
        const rest = state.projects.filter((p) => p.id !== project.id);
        return { projects: [...rest, project], loaded: true };
    })
}));
