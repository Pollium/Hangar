import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnMessage } from '@/shared/gateways/Gateway';
import { Payload } from '@/shared/gateways/GatewayParams';

interface PingPayload{
    at: number;
}

/**
 * Smoke-test gateway proving the WebSocket loop end to end. The terminal gateway
 * (phase 15) follows this exact shape, swapping the echo for a PTY bridge.
 */
@Channel('/health/ping')
export default class HealthGateway extends BaseGateway{
    @OnMessage('ping')
    ping(@Payload() payload: PingPayload){
        return { pong: payload.at };
    }
}
