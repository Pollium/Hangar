import { createParamDecorator } from '@/shared/controllers/params';
import { PAYLOAD, SOCKET, type GatewayContext } from './context';

/** Injects the parsed inbound frame (the message body, including its `type`). */
export const Payload = (): ParameterDecorator =>
    createParamDecorator((req) => (req as GatewayContext)[PAYLOAD]);

/** Injects the live socket, for handlers that push instead of (or as well as) return. */
export const Socket = (): ParameterDecorator =>
    createParamDecorator((req) => (req as GatewayContext)[SOCKET]);
