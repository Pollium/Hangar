import { Queue, Worker, type ConnectionOptions, type RepeatOptions } from 'bullmq';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port
};

export default abstract class BaseQueue<T>{
    abstract readonly name: string;

    #queue?: Queue;
    #worker?: Worker;

    async add(data: T): Promise<void>{
        this.#queue ??= new Queue(this.name, { connection });
        const job = await this.#queue.add(this.name, data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
        logger.debug(this.name, { scope: 'queue.enqueue', jobId: job.id });
    }

    abstract process(data: T): Promise<void>;

    protected async schedule(repeat: Omit<RepeatOptions, 'key'>, data?: T): Promise<void>{
        this.#queue ??= new Queue(this.name, { connection });
        await this.#queue.upsertJobScheduler(this.name, repeat, { name: this.name, data });
        logger.debug(this.name, { scope: 'queue.schedule' });
    }

    startWorker(): Worker{
        this.#worker ??= new Worker(this.name, (job) => this.process(job.data as T), { connection })
            .on('active', (job) => logger.debug(this.name, { scope: 'queue.active', jobId: job.id }))
            .on('completed', (job) => logger.debug(this.name, { scope: 'queue.completed', jobId: job.id }))
            .on('failed', (job) => logger.debug(this.name, { scope: 'queue.failed', jobId: job?.id, attempts: job?.attemptsMade }));
        return this.#worker;
    }

    async close(): Promise<void>{
        await this.#worker?.close();
        await this.#queue?.close();
    }
}
