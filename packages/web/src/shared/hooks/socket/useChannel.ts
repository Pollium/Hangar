import { useCallback, useEffect, useRef, useState } from 'react';
import { channelPool } from '@/shared/services/socket/ChannelPool';
import type { ChannelApi, ChannelHandlers, ChannelStatus, HandlersFor } from '@/shared/contracts/channel';

export const useChannel = <P extends string>(path: P, handlers: HandlersFor<P>): ChannelApi => {
    const [status, setStatus] = useState<ChannelStatus>('connecting');
    const [error, setError] = useState<string | null>(null);

    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        const channel = channelPool.acquire(path);
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
            channelPool.release(path);
        };
    }, [path]);

    const send = useCallback((type: string, data?: unknown): boolean => (
        channelPool.peek(path)?.send(type, data) ?? false
    ), [path]);
    const clearError = useCallback(() => setError(null), []);

    return { send, clearError, status, error };
};
