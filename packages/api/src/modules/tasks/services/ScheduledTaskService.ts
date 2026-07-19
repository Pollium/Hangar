import { logger } from '@/core/utils/Logger';
import ProjectService from '@/modules/projects/services/ProjectService';
import { getAdapter } from '@/modules/clis/adapters/registry';
import SessionService from '@/modules/sessions/services/SessionService';
import SessionRuntimeService from '@/modules/sessions/services/SessionRuntimeService';
import TmuxService from '@/modules/sessions/services/TmuxService';
import SandboxService from '@/modules/sandboxes/services/SandboxService';
import ScheduledTask from '../models/ScheduledTask';
import { cronMatches } from './cron';
import { ScheduledTaskError } from '../contracts/domain/errors';
import type { CreateScheduledTaskInput, UpdateScheduledTaskInput } from '@hangar/contracts/modules/task/http';

export default class ScheduledTaskService{
    #projects = new ProjectService();
    #sessions = new SessionService();
    #runtime = new SessionRuntimeService();
    #sandboxes = new SandboxService();
    #tmux = new TmuxService();

    async create(userId: number, input: CreateScheduledTaskInput): Promise<ScheduledTask>{
        await this.#projects.get(userId, input.projectId);
        getAdapter(input.cliType);
        const entity = ScheduledTask.create({
            projectId: input.projectId,
            ownerId: userId,
            title: input.title,
            cliType: input.cliType,
            prompt: input.prompt,
            cron: input.cron,
            enabled: true,
            lastRunAt: null
        });
        return entity.save() as Promise<ScheduledTask>;
    }

    list(userId: number): Promise<ScheduledTask[]>{
        return ScheduledTask.findBy({ ownerId: userId });
    }

    async update(userId: number, id: number, patch: UpdateScheduledTaskInput): Promise<ScheduledTask>{
        const task = await this.#require(userId, id);
        return Object.assign(task, patch).save() as Promise<ScheduledTask>;
    }

    async remove(userId: number, id: number): Promise<void>{
        const task = await this.#require(userId, id);
        await task.remove();
    }

    /** Runs every enabled task whose cron matches `now` and hasn't already run this minute. */
    async runDue(now: Date): Promise<void>{
        const tasks = await ScheduledTask.findBy({ enabled: true });
        for(const task of tasks){
            if(!cronMatches(task.cron, now)) continue;
            if(task.lastRunAt && this.#sameMinute(task.lastRunAt, now)) continue;
            await this.#run(task, now);
        }
    }

    async #run(task: ScheduledTask, now: Date): Promise<void>{
        try{
            const session = await this.#sessions.create(task.ownerId, {
                projectId: task.projectId,
                cliType: task.cliType,
                title: `${task.title} (scheduled)`
            });
            await this.#runtime.start(session);
            const { handle } = await this.#sandboxes.ensureRunning(task.ownerId, task.projectId);
            await this.#tmux.sendKeys(handle, this.#tmux.name(session.id), task.prompt);

            task.lastRunAt = now;
            await task.save();
        }catch(error){
            logger.error('scheduled task run failed', error, { scope: 'task.run', taskId: task.id });
        }
    }

    #sameMinute(a: Date, b: Date): boolean{
        return Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);
    }

    async #require(userId: number, id: number): Promise<ScheduledTask>{
        const task = await ScheduledTask.findOneBy({ id });
        if(!task) throw ScheduledTaskError.NotFound();
        if(task.ownerId !== userId) throw ScheduledTaskError.Forbidden();
        return task;
    }
}
