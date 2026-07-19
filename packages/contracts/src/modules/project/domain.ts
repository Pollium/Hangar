import type { BaseEntity } from '../../shared/base';

export interface ProjectProfile{
    name: string;
    description: string;
    baseImage: string;
    defaultCli: string;
}

export interface ProjectRepositoryProfile{
    id: number;
    projectId: number;
    url: string;
}

export interface Project extends ProjectProfile, BaseEntity{
    ownerId: number;
    inviteToken: string;
}
