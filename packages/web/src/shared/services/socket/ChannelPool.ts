import SocketChannel from '@/shared/services/socket/SocketChannel';

interface PoolEntry{
    channel: SocketChannel;
    refs: number;
}

class ChannelPool{
    readonly #entries = new Map<string, PoolEntry>();

    // `path` decides the WebSocket URL; `poolKey` decides sharing. They differ only when a caller
    // wants a dedicated socket on a shared path (e.g. one terminal PTY per tiled pane): same path,
    // distinct key → distinct socket. Default key = path preserves the shared-per-path behaviour.
    acquire(path: string, poolKey: string = path): SocketChannel{
        const entry = this.#entries.get(poolKey);
        if(entry){
            entry.refs += 1;
            return entry.channel;
        }
        const channel = new SocketChannel(path);
        this.#entries.set(poolKey, { channel, refs: 1 });
        return channel;
    }

    release(poolKey: string): void{
        const entry = this.#entries.get(poolKey);
        if(!entry) return;
        entry.refs -= 1;
        if(entry.refs <= 0){
            entry.channel.close();
            this.#entries.delete(poolKey);
        }
    }

    peek(poolKey: string): SocketChannel | undefined{
        return this.#entries.get(poolKey)?.channel;
    }
}

export const channelPool = new ChannelPool();
