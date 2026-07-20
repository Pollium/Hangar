import { useCallback, useEffect, useRef, useState } from 'react';
import { channelPool } from '@/shared/services/socket/ChannelPool';
import type { ChannelApi, ChannelHandlers, ChannelStatus, HandlersFor } from '@/shared/contracts/channel';

interface ChannelOptions{
    /**
     * Opt into a dedicated socket on an otherwise shared path. Callers on the same path but with
     * distinct keys get distinct WebSockets — required to run several terminal PTYs at once, since
     * the gateway attaches one session per socket. Omit to keep the default shared-per-path socket.
     */
    instanceKey?: string;
}

export const useChannel = <P extends string>(
    path: P,
    handlers: HandlersFor<P>,
    options?: ChannelOptions
): ChannelApi => {
    const [status, setStatus] = useState<ChannelStatus>('connecting');
    const [error, setError] = useState<string | null>(null);
    const poolKey = options?.instanceKey ? `${path}#${options.instanceKey}` : path;

    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        const channel = channelPool.acquire(path, poolKey);
        const offStatus = channel.onStatus((next) => {
            setStatus(next);
        });
        const offError = channel.onError(setError);

        const offs = Object.keys(handlersRef.current as ChannelHandlers).map((type) =>
            channel.on(type, (data) => {
                (handlersRef.current as ChannelHandlers)[type]?.(data);
            })
        );

        return () => {
            offStatus();
            offError();
            offs.forEach((off) => off());
            channelPool.release(poolKey);
        };
    }, [path, poolKey]);

    const send = useCallback((type: string, data?: unknown): boolean => (
        channelPool.peek(poolKey)?.send(type, data) ?? false
    ), [poolKey]);
    const clearError = useCallback(() => setError(null), []);

    return { send, clearError, status, error };
};
