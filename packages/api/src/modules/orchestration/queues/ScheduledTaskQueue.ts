import BaseQueue from '@/shared/queues/BaseQueue';
import ScheduledTaskService from '@/modules/tasks/services/ScheduledTaskService';

/**
 * Heartbeat queue: fires once a minute and runs every scheduled task whose cron matches.
 * A single scheduler (keyed by the queue name) drives all tasks — the per-task cron check
 * lives in the service, so no per-task BullMQ scheduler is needed.
 */
export default class ScheduledTaskQueue extends BaseQueue<Record<string, never>>{
    readonly name = 'scheduled-tasks';
    #service = new ScheduledTaskService();

    startWorker(){
        const worker = super.startWorker();
        void this.schedule({ every: 60_000 });
        return worker;
    }

    async process(): Promise<void>{
        await this.#service.runDue(new Date());
    }
}
