import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { NumericParam, Query, Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import SandboxService from '../services/SandboxService';
import { sandboxRoutes } from '@hangar/contracts/modules/sandbox/routes';
import type { CloneRepoInput, RenameFileInput, DeleteFileInput, CreateFileInput, GitRepoInput, GitCheckoutInput } from '@hangar/contracts/modules/sandbox/http';

@Middleware(AuthenticatedRoute)
export default class SandboxController extends BaseController{
    #service = new SandboxService();

    @Route(sandboxRoutes.get)
    get(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.status(userId, projectId);
    }

    @Route(sandboxRoutes.provision)
    @Status(201)
    provision(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.provision(userId, projectId);
    }

    @Route(sandboxRoutes.start)
    start(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.start(userId, projectId);
    }

    @Route(sandboxRoutes.stop)
    stop(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.stop(userId, projectId);
    }

    @Route(sandboxRoutes.usage)
    usage(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.usage(userId, projectId);
    }

    @Route(sandboxRoutes.destroy)
    destroy(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number){
        return this.#service.destroy(userId, projectId);
    }

    @Route(sandboxRoutes.files)
    files(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Query('path') path?: string){
        return this.#service.listFiles(userId, projectId, path);
    }

    @Route(sandboxRoutes.search)
    search(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Query('q') q?: string){
        return this.#service.searchFiles(userId, projectId, q);
    }

    @Route(sandboxRoutes.git)
    git(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Query('repo') repo?: string){
        return this.#service.gitInfo(userId, projectId, repo);
    }

    @Route(sandboxRoutes.renameFile)
    async renameFile(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: RenameFileInput){
        await this.#service.renameFile(userId, projectId, body.path, body.to);
        return { ok: true as const };
    }

    @Route(sandboxRoutes.deleteFile)
    async deleteFile(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: DeleteFileInput){
        await this.#service.deleteFile(userId, projectId, body.path);
        return { ok: true as const };
    }

    @Route(sandboxRoutes.createFile)
    async createFile(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: CreateFileInput){
        await this.#service.createEntry(userId, projectId, body.path, body.type);
        return { ok: true as const };
    }

    @Route(sandboxRoutes.gitPull)
    gitPull(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: GitRepoInput){
        return this.#service.gitPull(userId, projectId, body.repo);
    }

    @Route(sandboxRoutes.gitPush)
    gitPush(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: GitRepoInput){
        return this.#service.gitPush(userId, projectId, body.repo);
    }

    @Route(sandboxRoutes.gitFetch)
    gitFetch(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: GitRepoInput){
        return this.#service.gitFetch(userId, projectId, body.repo);
    }

    @Route(sandboxRoutes.gitCheckout)
    gitCheckout(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: GitCheckoutInput){
        return this.#service.gitCheckout(userId, projectId, body.repo, body.branch);
    }

    @Route(sandboxRoutes.clone)
    async clone(@CurrentUser() userId: number, @NumericParam('projectId') projectId: number, @Body() body: CloneRepoInput){
        await this.#service.cloneRepository(userId, projectId, body.url);
        return { ok: true as const };
    }
}
