import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { eventBus } from '@/shared/events/EventBus';
import { agentRegistry } from '@/modules/agents/transport/AgentRegistry';
import ProjectService from '@/modules/projects/services/ProjectService';
import CredentialService from '@/modules/credentials/services/CredentialService';
import type { IDockerService, IContainerHandle } from '@/shared/services/docker/contracts';
import type Project from '@/modules/projects/models/Project';
import { posix as pathPosix } from 'node:path';
import Sandbox from '../models/Sandbox';
import SandboxProvisioner from './SandboxProvisioner';
import { repoSlug } from './repoSlug';
import { SandboxError } from '../contracts/domain/errors';
import type { SandboxUsage, FileEntry, GitInfo, GitRepoInfo, GitBranch, GitCommit, GitChange } from '@hangar/contracts/modules/sandbox/domain';

const WORKSPACE = '/workspace';

// All service instances in this API process share the same project provisioning flight.
const provisionFlights = new Map<string, Promise<Sandbox>>();

/**
 * Manages a project's sandbox — but never on the control-plane host. Every Docker operation runs
 * on the project owner's connected agent (their VPS); with no agent online the owner's sandboxes
 * simply cannot run (Agent::NoAgentConnected), by design.
 */
export default class SandboxService{
    #projects = new ProjectService();
    #provisioner = new SandboxProvisioner();
    #credentials = new CredentialService();

    /** Docker bound to the given owner's live agent, or throws when none is connected. */
    #dockerFor(ownerId: number): IDockerService{
        return agentRegistry.dockerFor(ownerId);
    }

    async status(userId: number, projectId: number): Promise<Sandbox>{
        await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        return sandbox;
    }

    async provision(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const key = `${config.docker.namespace}:${project.id}`;
        const active = provisionFlights.get(key);
        if(active) return active;

        const task = this.#provisionProject(project);
        provisionFlights.set(key, task);
        try{
            return await task;
        }finally{
            if(provisionFlights.get(key) === task) provisionFlights.delete(key);
        }
    }

    async start(userId: number, projectId: number): Promise<Sandbox>{
        const project = await this.#projects.get(userId, projectId);
        const sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox) throw SandboxError.NotFound();
        if(!sandbox.containerId) return this.provision(userId, projectId);

        const handle = this.#dockerFor(sandbox.ownerId).get(sandbox.containerId);
        if(!(await handle.isRunning())){
            try{
                await handle.start();
            }catch{
                sandbox.containerId = null;
                sandbox.status = 'error';
                await sandbox.save();
                return this.provision(userId, projectId);
            }
        }
        sandbox.status = 'running';
        sandbox.lastStartedAt = new Date();
        await sandbox.save();
        this.#emit('sandbox.started', sandbox);
        void project;
        return sandbox;
    }

    async stop(userId: number, projectId: number): Promise<Sandbox>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.containerId) await this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).stop();
        sandbox.status = 'stopped';
        await sandbox.save();
        this.#emit('sandbox.stopped', sandbox);
        return sandbox;
    }

    async destroy(userId: number, projectId: number): Promise<void>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.containerId){
            try{
                await this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).remove(false);
            }catch{
                // container already gone or agent offline — the row is removed regardless
            }
        }
        await sandbox.remove();
    }

    async usage(userId: number, projectId: number): Promise<SandboxUsage>{
        const sandbox = await this.status(userId, projectId);
        if(sandbox.status !== 'running' || !sandbox.containerId){
            return { cpuPercent: 0, memUsedMb: 0, memLimitMb: sandbox.limits.memoryMb };
        }
        return this.#dockerFor(sandbox.ownerId).get(sandbox.containerId).stats();
    }

    /** Provisions or starts as needed and returns the live container on the owner's agent. */
    async ensureRunning(userId: number, projectId: number): Promise<{ sandbox: Sandbox; handle: IContainerHandle }>{
        let sandbox = await Sandbox.findOneBy({ projectId });
        if(!sandbox || !sandbox.containerId){
            sandbox = await this.provision(userId, projectId);
        }else{
            const current = this.#dockerFor(sandbox.ownerId).get(sandbox.containerId);
            if(sandbox.status !== 'running' || !(await current.isRunning())){
                sandbox = await this.start(userId, projectId);
            }
        }
        return { sandbox, handle: this.#dockerFor(sandbox.ownerId).get(sandbox.containerId as string) };
    }

    /**
     * Immediate children of a directory in the workspace, for the file explorer. Auto-starts the
     * sandbox. The path is normalized and confined to /workspace (no traversal); a missing dir
     * yields an empty list rather than an error so a just-provisioned workspace reads cleanly.
     */
    async listFiles(userId: number, projectId: number, requestedPath?: string): Promise<FileEntry[]>{
        const target = pathPosix.normalize(requestedPath?.trim() || WORKSPACE);
        if(target !== WORKSPACE && !target.startsWith(`${WORKSPACE}/`)) throw SandboxError.InvalidPath();

        const { handle } = await this.ensureRunning(userId, projectId);
        const result = await handle.exec(['find', target, '-maxdepth', '1', '-mindepth', '1', '-printf', '%y\t%f\n']);
        if(result.exitCode !== 0) return [];

        const entries = result.output.split('\n').filter(Boolean).map((line): FileEntry => {
            const tab = line.indexOf('\t');
            const kind = line.slice(0, tab);
            const name = line.slice(tab + 1);
            return { name, path: `${target}/${name}`, type: kind === 'd' ? 'dir' : 'file' };
        });
        // Directories first, then alphabetical — matches a familiar file-tree order.
        return entries.sort((a, b) => a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name));
    }

    /** Normalizes a requested path and confines it strictly inside /workspace (never the root). */
    #resolveWorkspacePath(requested: string, { allowRoot = false } = {}): string{
        const target = pathPosix.normalize(requested.trim());
        const inside = target === WORKSPACE || target.startsWith(`${WORKSPACE}/`);
        if(!inside) throw SandboxError.InvalidPath();
        if(!allowRoot && target === WORKSPACE) throw SandboxError.InvalidPath();
        return target;
    }

    /**
     * Renames/moves a workspace entry. Both paths are confined to /workspace (the root itself can
     * never be the source or destination). Runs `mv` as argv — a path can never be interpreted as
     * shell syntax. `-n` (no-clobber) refuses to overwrite an existing destination.
     */
    async renameFile(userId: number, projectId: number, from: string, to: string): Promise<void>{
        const src = this.#resolveWorkspacePath(from);
        const dest = this.#resolveWorkspacePath(to);

        const { handle } = await this.ensureRunning(userId, projectId);
        const result = await handle.exec(['mv', '-n', '--', src, dest]);
        if(result.exitCode !== 0){
            throw SandboxError.FileOperationFailed(result.output.split('\n').filter(Boolean).pop() || 'rename failed');
        }
    }

    /**
     * Deletes a workspace entry (file or directory, recursively). Confined to /workspace and never
     * the root itself. Runs `rm -rf` as argv with a `--` guard so a path can neither escape the
     * workspace nor be read as an option or shell syntax.
     */
    async deleteFile(userId: number, projectId: number, path: string): Promise<void>{
        const target = this.#resolveWorkspacePath(path);

        const { handle } = await this.ensureRunning(userId, projectId);
        const result = await handle.exec(['rm', '-rf', '--', target]);
        if(result.exitCode !== 0){
            throw SandboxError.FileOperationFailed(result.output.split('\n').filter(Boolean).pop() || 'delete failed');
        }
    }

    /**
     * Creates a new empty file or directory in the workspace. Confined to /workspace. Parent
     * directories are created as needed. Runs as argv (mkdir -p / touch). Refuses to clobber an
     * existing path so a "New file" never truncates real content.
     */
    async createEntry(userId: number, projectId: number, path: string, type: 'file' | 'dir'): Promise<void>{
        const target = this.#resolveWorkspacePath(path);

        const { handle } = await this.ensureRunning(userId, projectId);
        const existing = await handle.exec(['test', '-e', target]);
        if(existing.exitCode === 0) throw SandboxError.FileOperationFailed('A file or folder with that name already exists.');

        if(type === 'dir'){
            const made = await handle.exec(['mkdir', '-p', '--', target]);
            if(made.exitCode !== 0) throw SandboxError.FileOperationFailed(made.output.split('\n').filter(Boolean).pop() || 'create failed');
            return;
        }
        // Ensure the parent dir exists, then touch the file — as two argv steps, no shell.
        const parent = pathPosix.dirname(target);
        await handle.exec(['mkdir', '-p', '--', parent]);
        const made = await handle.exec(['touch', '--', target]);
        if(made.exitCode !== 0) throw SandboxError.FileOperationFailed(made.output.split('\n').filter(Boolean).pop() || 'create failed');
    }

    /**
     * Recursive file search across the workspace: returns files whose path contains the query
     * (case-insensitive), capped for responsiveness. Prunes node_modules and .git. Runs `find` as
     * argv; the query is matched in JS (never interpolated into the command) so it can't inject.
     */
    async searchFiles(userId: number, projectId: number, query?: string): Promise<FileEntry[]>{
        const needle = query?.trim().toLowerCase();
        if(!needle) return [];

        const { handle } = await this.ensureRunning(userId, projectId);
        const found = await handle.exec([
            'find', WORKSPACE,
            '(', '-name', 'node_modules', '-o', '-name', '.git', ')', '-prune',
            '-o', '-type', 'f', '-print'
        ]);
        if(found.exitCode !== 0) return [];

        const results: FileEntry[] = [];
        for(const full of found.output.split('\n')){
            if(!full || !full.startsWith(`${WORKSPACE}/`)) continue;
            if(!full.toLowerCase().includes(needle)) continue;
            results.push({ name: full.slice(full.lastIndexOf('/') + 1), path: full, type: 'file' });
            if(results.length >= 100) break;
        }
        return results;
    }

    /**
     * Source-control view of the workspace: every git repo under /workspace (by subdirectory
     * slug) and, for the requested `repo` (defaulting to the first), its branches and recent
     * commits. Auto-starts the sandbox. All `git` invocations run as argv with an explicit
     * `-C <repo>` (never a shell), and the repo arg is confined to a single /workspace child, so
     * a slug can neither escape the workspace nor be interpreted as shell syntax. A repo with no
     * commits (freshly `git init`ed) reads as an empty history rather than an error.
     */
    async gitInfo(userId: number, projectId: number, requestedRepo?: string): Promise<GitInfo>{
        const { handle } = await this.ensureRunning(userId, projectId);
        const repos = await this.#discoverRepos(handle);

        const slug = requestedRepo && repos.includes(requestedRepo) ? requestedRepo : repos[0];
        if(!slug) return { repos, selected: null };
        return { repos, selected: await this.#repoDetail(handle, slug) };
    }

    /**
     * Discovers every git repo in the workspace at ANY depth (not just direct children of
     * /workspace): a directory named `.git` marks a repo root. Prunes node_modules (vendored deps
     * sometimes ship a .git, and it's a needless perf sink) and doesn't descend into the .git dirs
     * themselves. Submodule/worktree `.git` *files* (-type d excludes them) aren't treated as
     * separate repos — they belong to their parent. Returns repo paths relative to /workspace.
     */
    async #discoverRepos(handle: IContainerHandle): Promise<string[]>{
        const found = await handle.exec(['find', WORKSPACE, '-name', 'node_modules', '-prune', '-o', '-type', 'd', '-name', '.git', '-prune', '-print']);
        return (found.exitCode === 0 ? found.output.split('\n') : [])
            .filter(Boolean)
            // /workspace/a/b/.git -> "a/b" (the repo's path relative to the workspace root).
            .map((gitDir) => gitDir.replace(/\/\.git$/, '').slice(WORKSPACE.length + 1))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    }

    /**
     * Resolves a client-supplied repo id to an absolute path, but ONLY if it is a repo actually
     * discovered in the workspace — an unknown/crafted value is rejected, so the id can never point
     * outside /workspace regardless of its contents.
     */
    async #resolveRepo(handle: IContainerHandle, repo: string): Promise<string>{
        const repos = await this.#discoverRepos(handle);
        if(!repos.includes(repo)) throw SandboxError.InvalidPath();
        return `${WORKSPACE}/${repo}`;
    }

    /**
     * Reads a single repo's source-control detail: current branch, upstream + ahead/behind,
     * local/remote branches, recent commits, and working-tree changes. All `git` calls run as argv
     * with an explicit `-C <repoPath>` (never a shell). A repo with no commits reads as empty
     * history rather than an error.
     */
    async #repoDetail(handle: IContainerHandle, slug: string): Promise<GitRepoInfo>{
        const repoPath = `${WORKSPACE}/${slug}`;
        const [branchRes, upstreamRes, refsRes, logRes, statusRes] = await Promise.all([
            handle.exec(['git', '-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD']),
            handle.exec(['git', '-C', repoPath, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']),
            handle.exec(['git', '-C', repoPath, 'for-each-ref', '--format=%(refname)%09%(HEAD)', 'refs/heads', 'refs/remotes']),
            handle.exec(['git', '-C', repoPath, 'log', '-n', '50', '--format=%h%x09%an%x09%aI%x09%s']),
            handle.exec(['git', '-C', repoPath, 'status', '--porcelain'])
        ]);

        const rawBranch = branchRes.exitCode === 0 ? branchRes.output.trim() : '';
        const branch = rawBranch && rawBranch !== 'HEAD' ? rawBranch : null;
        const upstream = upstreamRes.exitCode === 0 ? (upstreamRes.output.trim() || null) : null;

        // ahead/behind vs upstream (only meaningful when an upstream exists).
        let ahead = 0;
        let behind = 0;
        if(upstream){
            const counts = await handle.exec(['git', '-C', repoPath, 'rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
            if(counts.exitCode === 0){
                const [b = '0', a = '0'] = counts.output.trim().split(/\s+/);
                behind = Number(b) || 0;
                ahead = Number(a) || 0;
            }
        }

        const branches: GitBranch[] = (refsRes.exitCode === 0 ? refsRes.output.split('\n') : [])
            .filter(Boolean)
            .map((line): GitBranch => {
                const tab = line.indexOf('\t');
                const refname = tab === -1 ? line : line.slice(0, tab);
                const head = tab !== -1 && line.slice(tab + 1).trim() === '*';
                const remote = refname.startsWith('refs/remotes/');
                const name = refname.replace(/^refs\/(heads|remotes)\//, '');
                return { name, current: head, remote };
            })
            // Skip the symbolic origin/HEAD -> origin/main pointer; it isn't a real branch.
            .filter((entry) => !entry.name.endsWith('/HEAD'));

        const commits: GitCommit[] = (logRes.exitCode === 0 ? logRes.output.split('\n') : [])
            .filter(Boolean)
            .map((line): GitCommit => {
                const [hash = '', author = '', date = '', ...rest] = line.split('\t');
                return { hash, author, date, subject: rest.join('\t') };
            });

        // Porcelain v1: 2 status chars, a space, then the path (rename shows "old -> new").
        const changes: GitChange[] = (statusRes.exitCode === 0 ? statusRes.output.split('\n') : [])
            .filter((line) => line.length > 3)
            .map((line): GitChange => {
                const code = line.slice(0, 2);
                const rest = line.slice(3);
                const path = rest.includes(' -> ') ? rest.split(' -> ')[1] : rest;
                const untracked = code === '??';
                // Left column = index (staged); ' ' or '?' means not staged.
                const staged = !untracked && code[0] !== ' ' && code[0] !== '?';
                return { path, code, staged, untracked };
            });

        return { slug, branch, upstream, ahead, behind, branches, commits, changes };
    }

    /** Pulls the selected repo (ff/merge), authenticating private remotes with the owner's token. */
    async gitPull(userId: number, projectId: number, repo: string): Promise<GitInfo>{
        return this.#gitAction(userId, projectId, repo, (handle, repoPath, env) =>
            handle.exec(['git', '-C', repoPath, 'pull', '--ff'], { env }));
    }

    /** Pushes the selected repo's current branch to its upstream, authenticating with the token. */
    async gitPush(userId: number, projectId: number, repo: string): Promise<GitInfo>{
        return this.#gitAction(userId, projectId, repo, (handle, repoPath, env) =>
            handle.exec(['git', '-C', repoPath, 'push'], { env }));
    }

    /** Fetches all remotes (with prune) for the selected repo. */
    async gitFetch(userId: number, projectId: number, repo: string): Promise<GitInfo>{
        return this.#gitAction(userId, projectId, repo, (handle, repoPath, env) =>
            handle.exec(['git', '-C', repoPath, 'fetch', '--all', '--prune'], { env }));
    }

    /**
     * Checks out an existing branch. A remote branch name (origin/foo) is checked out as a local
     * tracking branch (foo) via `git checkout <foo>`, which git resolves to the remote when no
     * local branch exists. The branch name is passed as argv.
     */
    async gitCheckout(userId: number, projectId: number, repo: string, branch: string): Promise<GitInfo>{
        const name = branch.trim();
        if(!name) throw SandboxError.InvalidPath();
        // origin/feature -> feature (let git set up tracking); a plain local name passes through.
        const local = name.replace(/^[^/]+\//, '');
        return this.#gitAction(userId, projectId, repo, (handle, repoPath) =>
            handle.exec(['git', '-C', repoPath, 'checkout', local]));
    }

    /**
     * Shared runner for git write actions: resolves+validates the repo, injects the owner's
     * GITHUB_TOKEN through the process env (never persisted to the volume) so private remotes
     * authenticate, runs the action, and returns the repo's refreshed detail. A non-zero exit
     * surfaces the last stderr line as a FileOperationFailed cause.
     */
    async #gitAction(
        userId: number,
        projectId: number,
        repo: string,
        action: (handle: IContainerHandle, repoPath: string, env: string[]) => Promise<{ exitCode: number; output: string }>
    ): Promise<GitInfo>{
        const { handle } = await this.ensureRunning(userId, projectId);
        const repoPath = await this.#resolveRepo(handle, repo);
        const env = await this.#credentials.resolveEnvFor(userId, ['GITHUB_TOKEN']);

        const result = await action(handle, repoPath, env);
        if(result.exitCode !== 0){
            throw SandboxError.FileOperationFailed(result.output.split('\n').filter(Boolean).pop() || 'git action failed');
        }

        const repos = await this.#discoverRepos(handle);
        return { repos, selected: await this.#repoDetail(handle, repo) };
    }

    /**
     * Clones a repo into the running workspace (skipping if its slug dir already exists) and
     * persists it to the project so future provisions re-clone it. Private repos authenticate via
     * the owner's GITHUB_TOKEN through the sandbox's baked-in credential helper. `git`/`test` run
     * as argv — a URL can never be interpreted as shell syntax.
     */
    async cloneRepository(userId: number, projectId: number, url: string): Promise<void>{
        const trimmed = url.trim();
        if(!/^https?:\/\//i.test(trimmed)) throw SandboxError.InvalidPath();

        const { handle } = await this.ensureRunning(userId, projectId);
        const dest = `${WORKSPACE}/${repoSlug(trimmed)}`;
        const existing = await handle.exec(['test', '-e', dest]);
        if(existing.exitCode !== 0){
            // The owner's GITHUB_TOKEN reaches the credential helper only through the process env
            // (never written to the volume), so a private repo authenticates like a session push.
            const env = await this.#credentials.resolveEnvFor(userId, ['GITHUB_TOKEN']);
            const clone = await handle.exec(['git', 'clone', trimmed, dest], { cwd: WORKSPACE, env });
            if(clone.exitCode !== 0) throw SandboxError.CloneFailed(clone.output.split('\n').filter(Boolean).pop());
        }

        const repos = await this.#projects.listRepositories(userId, projectId);
        if(!repos.some((repo) => repo.url === trimmed)){
            await this.#projects.addRepository(userId, projectId, { url: trimmed });
        }
    }

    async #provisionProject(project: Project): Promise<Sandbox>{
        const sandbox = await this.#ensureRow(project.id, project.ownerId);
        sandbox.status = 'provisioning';
        await sandbox.save();

        try{
            const docker = this.#dockerFor(project.ownerId);
            const handle = await this.#provisioner.provision(project, sandbox, docker);
            sandbox.containerId = handle.id;
            sandbox.status = 'running';
            sandbox.lastStartedAt = new Date();
            await sandbox.save();
            this.#emit('sandbox.started', sandbox);
            return sandbox;
        }catch(error){
            sandbox.status = 'error';
            await sandbox.save();
            throw SandboxError.ProvisionFailed(error instanceof Error ? error.message : undefined);
        }
    }

    async #ensureRow(projectId: number, ownerId: number): Promise<Sandbox>{
        const expectedVolume = this.#provisioner.volumeName(projectId);
        const existing = await Sandbox.findOneBy({ projectId });
        if(existing){
            if(!existing.containerId && existing.volumeName !== expectedVolume){
                existing.volumeName = expectedVolume;
                await existing.save();
            }
            return existing;
        }
        return Sandbox.create({
            projectId,
            ownerId,
            containerId: null,
            volumeName: expectedVolume,
            status: 'provisioning',
            limits: {
                memoryMb: config.docker.defaultMemoryMb,
                cpus: config.docker.defaultCpus,
                pidsLimit: config.docker.defaultPidsLimit
            },
            lastStartedAt: null
        }).save();
    }

    #emit(event: 'sandbox.started' | 'sandbox.stopped', sandbox: Sandbox): void{
        eventBus.emit(event, { sandboxId: sandbox.id, projectId: sandbox.projectId, ownerId: sandbox.ownerId });
    }
}
