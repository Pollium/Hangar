import { createHmac } from 'crypto';
import { config } from '@/shared/config';
import SandboxService from '@/modules/sandboxes/services/SandboxService';
import TmuxService from '@/modules/sessions/services/TmuxService';
import ProjectService from '@/modules/projects/services/ProjectService';
import JWTService from '@/modules/auth/services/JWTService';
import CredentialService from '@/modules/credentials/services/CredentialService';

/**
 * The port code-server binds inside the container — derived from the project id and the JWT
 * secret rather than fixed. All project sandboxes share one network and code-server runs with
 * `--auth none`, so a fixed 8080 would let one project's container reach another's editor. A
 * secret-derived port is stable across restarts (nothing to persist, the proxy recomputes it)
 * yet unguessable by a peer container that lacks the secret. Range 20000-59999 dodges
 * privileged and common ports.
 */
export const codeServerPort = (projectId: number): number => {
    const digest = createHmac('sha256', config.jwtSecret).update(`codespace:${projectId}`).digest();
    return 20000 + (digest.readUInt16BE(0) % 40000);
};

// One code-server per project container, owned by tmux like agent sessions — it survives with
// no viewer attached and re-attaches on the next open, matching the 24/7 sandbox model.
const CODESPACE_TMUX = 'hangar-codespace';

// code-server's own state (settings, installed extensions, editor/workspace state) lives here on
// the persisted /workspace volume, so it survives container restarts and recreation — mirroring
// how project files already persist. Its default home-dir location would be lost on recreation.
const CODESPACE_DATA = '/workspace/.codespace';

/**
 * Runs a per-project code-server (VS Code) inside the project's existing sandbox container and
 * mints the short-lived ticket the browser iframe uses to reach it through the API proxy.
 */
export default class CodespaceService{
    #sandboxes = new SandboxService();
    #projects = new ProjectService();
    #tmux = new TmuxService();
    #jwt = new JWTService();
    #credentials = new CredentialService();

    /**
     * Authorizes access, ensures the sandbox + code-server are up on the owner's agent, and mints
     * the short-lived iframe ticket. The token carries owner + container so the proxy can open the
     * tunnel with no further lookup. `ensureSession` is idempotent, so repeated opens no-op.
     */
    async prepare(userId: number, projectId: number): Promise<{ token: string; path: string }>{
        // SandboxService.ensureRunning skips the ownership check on the already-running path,
        // so gate access here explicitly (throws Forbidden for non-members).
        await this.#projects.get(userId, projectId);
        const { sandbox, handle } = await this.#sandboxes.ensureRunning(userId, projectId);
        // code-server inherits the opener's credentials so its integrated terminal can `git push`
        // (GITHUB_TOKEN + git identity) and reach providers, exactly like an agent session.
        const env = await this.#credentials.resolveEnvFor(userId);
        await this.#tmux.ensureSession(
            handle,
            CODESPACE_TMUX,
            [
                'code-server',
                '--bind-addr', `0.0.0.0:${codeServerPort(projectId)}`,
                '--auth', 'none',
                '--disable-telemetry',
                '--user-data-dir', `${CODESPACE_DATA}/user-data`,
                '--extensions-dir', `${CODESPACE_DATA}/extensions`,
                '/workspace'
            ],
            env,
            '/workspace'
        );

        const token = this.#jwt.signCodespace({
            userId,
            projectId,
            ownerId: sandbox.ownerId,
            containerId: handle.id
        });
        return { token, path: `/codespace/${projectId}/` };
    }
}
