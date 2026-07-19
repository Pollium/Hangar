import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '@/modules/projects/api/api';
import { useProjectsStore } from '@/modules/projects/store/projects';
import { useActiveProjectStore } from '@/modules/projects/store/activeProject';

export const useProjects = () => {
    const projects = useProjectsStore((state) => state.projects);
    const setProjects = useProjectsStore((state) => state.setProjects);
    const [loading, setLoading] = useState(true);
    const reconcile = useActiveProjectStore((state) => state.reconcile);

    const refresh = useCallback(async () => {
        setLoading(true);
        try{
            const list = await projectApi.list();
            setProjects(list);
            reconcile(list.map((project) => project.id));
        }finally{
            setLoading(false);
        }
    }, [setProjects, reconcile]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { projects, loading, refresh };
};
