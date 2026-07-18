import { DefineEventGroup, Event } from '@/shared/events/EventGroup';
import NotificationService from '../services/NotificationService';
import type { SessionAttentionPayload } from '@/modules/sessions/contracts/domain/events';

/** Turns session attention events into notifications the owner can act on. */
@DefineEventGroup('session')
export default class SessionNotifications{
    #service = new NotificationService();

    @Event('needs_input')
    async needsInput(payload: SessionAttentionPayload): Promise<void>{
        await this.#service.create(payload.ownerId, 'needs_input', payload.sessionId, `${payload.title} needs your input`);
    }

    @Event('idle')
    async idle(payload: SessionAttentionPayload): Promise<void>{
        await this.#service.create(payload.ownerId, 'idle', payload.sessionId, `${payload.title} finished its turn`);
    }
}
