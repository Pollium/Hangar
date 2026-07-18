import { get, post, patch, del } from '../../shared/routing';
import type { CreateScheduledTaskInput, UpdateScheduledTaskInput } from './http';
import type { ScheduledTask } from './domain';

export const taskRoutes = {
    list: get<ScheduledTask[]>('/tasks'),
    create: post<CreateScheduledTaskInput, ScheduledTask>('/tasks'),
    update: patch<UpdateScheduledTaskInput, ScheduledTask>('/tasks/:id'),
    remove: del('/tasks/:id')
};
