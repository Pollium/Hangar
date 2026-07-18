import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '@/modules/projects/api/api';
import type { Project } from '@cloud-code/contracts/modules/project/domain';

export const useProjects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try{
            setProjects(await projectApi.list());
        }finally{
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { projects, loading, refresh };
};
