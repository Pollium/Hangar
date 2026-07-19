import { get, post, patch, del } from '../../shared/routing';
import type { AddProjectRepositoryInput, CreateProjectInput, UpdateProjectInput } from './http';
import type { Project, ProjectRepositoryProfile } from './domain';

export const projectRoutes = {
    list: get<Project[]>('/projects'),
    create: post<CreateProjectInput, Project>('/projects'),
    get: get<Project>('/projects/:id'),
    update: patch<UpdateProjectInput, Project>('/projects/:id'),
    remove: del('/projects/:id'),
    rotateInvite: post<void, Project>('/projects/:id/invite/rotate'),
    joinInvite: post<void, Project>('/invites/:token/join'),
    listRepositories: get<ProjectRepositoryProfile[]>('/projects/:id/repos'),
    addRepository: post<AddProjectRepositoryInput, ProjectRepositoryProfile>('/projects/:id/repos'),
    removeRepository: del('/projects/:id/repos/:repoId')
};
