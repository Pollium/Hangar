import type { WebSocket } from '@fastify/websocket';

/** The live connection a handler receives via `@Socket()` when it needs to push. */
export type GatewaySocket = WebSocket;

/**
 * Every inbound frame is JSON carrying a `type` discriminator; the remaining
 * fields are the payload. Mirrors the HTTP request body, keyed by `type`.
 */
export interface InboundFrame{
    type: string;
    [field: string]: unknown;
}

/** Success envelope pushed back to the client — the WS analog of `{ data }`. */
export interface OutboundMessage<T>{
    type: string;
    data: T;
}

export type GatewayLifecycle = 'connect' | 'disconnect';

interface MessageHandler{
    kind: 'message';
    type: string;
    handlerName: string | symbol;
}

interface LifecycleHandler{
    kind: GatewayLifecycle;
    handlerName: string | symbol;
}

/** One handler recorded by `@OnMessage`/`@OnConnect`/`@OnDisconnect`. */
export type GatewayHandler = MessageHandler | LifecycleHandler;
