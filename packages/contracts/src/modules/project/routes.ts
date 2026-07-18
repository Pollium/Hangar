import { get, post, patch, del } from '../../shared/routing';
import type { CreateProjectInput, UpdateProjectInput } from './http';
import type { Project } from './domain';

export const projectRoutes = {
    list: get<Project[]>('/projects'),
    create: post<CreateProjectInput, Project>('/projects'),
    get: get<Project>('/projects/:id'),
    update: patch<UpdateProjectInput, Project>('/projects/:id'),
    remove: del('/projects/:id')
};
