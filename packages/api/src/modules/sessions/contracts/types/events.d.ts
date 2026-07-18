import type { SessionStatusChangedPayload, SessionAttentionPayload } from '../domain/events';

declare global{
    interface EventMap{
        'session.status_changed': SessionStatusChangedPayload;
        'session.needs_input': SessionAttentionPayload;
        'session.idle': SessionAttentionPayload;
    }
}
