import type { SessionStatusChangedPayload, SessionAttentionPayload, SessionRemovedPayload } from '../domain/events';

declare global{
    interface EventMap{
        'session.status_changed': SessionStatusChangedPayload;
        'session.removed': SessionRemovedPayload;
        'session.needs_input': SessionAttentionPayload;
        'session.idle': SessionAttentionPayload;
    }
}
