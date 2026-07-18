import { get, post, del } from '../../shared/routing';
import type { CreateSessionInput } from './http';
import type { Session, SessionEvent } from './domain';

export const sessionRoutes = {
    list: get<Session[]>('/sessions'),
    create: post<CreateSessionInput, Session>('/sessions'),
    get: get<Session>('/sessions/:id'),
    stop: post<void, Session>('/sessions/:id/stop'),
    remove: del('/sessions/:id'),
    events: get<SessionEvent[]>('/sessions/:id/events')
};
