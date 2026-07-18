import type { BaseEntity } from '../../shared/base';

export interface ProjectProfile{
    name: string;
    description: string;
    repoUrl: string | null;
    baseImage: string;
    defaultCli: string;
}

export interface Project extends ProjectProfile, BaseEntity{
    ownerId: number;
}
