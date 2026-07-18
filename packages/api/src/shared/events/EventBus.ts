import { EventEmitter } from 'node:events';
import { logger } from '@/core/utils/Logger';

type Handler = (payload: unknown) => unknown;

class EventBus{
    #emitter = new EventEmitter();

    subscribe(event: string, handler: Handler): void{
        this.#emitter.on(event, (payload) => {
            logger.debug(event, { scope: 'event.handle' });
            Promise.resolve()
                .then(() => handler(payload))
                .catch((error) => logger.error(`EventBus::HandlerFailed:${event}`, error));
        });
    }

    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void{
        logger.debug(event as string, { scope: 'event.emit' });
        this.#emitter.emit(event as string, payload);
    }
}

export const eventBus = new EventBus();
