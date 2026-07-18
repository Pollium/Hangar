import { get, patch, del } from '../../shared/routing';
import type { UpdateProfileInput, ChangePasswordInput } from './http';
import type { User } from './domain';

export const userRoutes = {
    me: get<User>('/user/me'),
    updateProfile: patch<UpdateProfileInput, User>('/user/me'),
    deleteMe: del('/user/me'),
    changePassword: patch<ChangePasswordInput>('/user/me/password')
};
