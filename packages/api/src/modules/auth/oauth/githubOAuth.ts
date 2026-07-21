import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import JWTService from '@/modules/auth/services/JWTService';
import CredentialService from '@/modules/credentials/services/CredentialService';

const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const API = 'https://api.github.com';
const UA = 'hangar';

interface GithubUser{ login: string; name: string | null; id: number; }
interface GithubEmail{ email: string; primary: boolean; verified: boolean; }

/**
 * "Connect GitHub" — a standard OAuth authorization-code flow. `start` (Bearer-authenticated) hands
 * the browser the authorize URL carrying a signed `state`; the public `callback` verifies that
 * state, swaps the code for a user access token (client secret stays here, never in the SPA), and
 * persists the token + git identity as the owner's credentials. They then inject into every sandbox
 * exactly like manual credentials, and a credential helper baked into the image lets `git push`
 * authenticate against github.com with no interaction.
 */
export const registerGithubOAuth = (app: FastifyInstance): void => {
    const jwt = new JWTService();
    const credentials = new CredentialService();

    const enabled = (): boolean => Boolean(config.github.clientId && config.github.clientSecret);
    const webReturn = (status: string): string => `${config.webUrl}/account?github=${status}`;

    const start = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
        if(!enabled()){ reply.code(501).send({ error: 'Github::NotConfigured' }); return; }

        const header = req.headers.authorization;
        if(!header?.startsWith('Bearer ')){ reply.code(401).send({ error: 'Auth::Unauthorized' }); return; }
        let userId: number;
        try{
            userId = Number(jwt.verify(header.slice('Bearer '.length).trim()).sub);
        }catch{
            reply.code(401).send({ error: 'Auth::InvalidToken' }); return;
        }

        const url = new URL(AUTHORIZE);
        url.searchParams.set('client_id', config.github.clientId as string);
        url.searchParams.set('redirect_uri', config.github.callbackUrl);
        url.searchParams.set('scope', config.github.scope);
        url.searchParams.set('state', jwt.signGithubState(userId));
        url.searchParams.set('allow_signup', 'false');
        reply.send({ url: url.toString() });
    };

    const callback = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const query = req.query as { code?: string; state?: string };
        if(!enabled() || !query.code || !query.state){ reply.redirect(webReturn('error')); return; }

        let userId: number;
        try{
            userId = jwt.verifyGithubState(query.state);
        }catch{
            reply.redirect(webReturn('error')); return;
        }

        try{
            const tokenRes = await fetch(TOKEN, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA },
                body: JSON.stringify({
                    client_id: config.github.clientId,
                    client_secret: config.github.clientSecret,
                    code: query.code,
                    redirect_uri: config.github.callbackUrl
                })
            });
            const tokenJson = await tokenRes.json() as { access_token?: string };
            const token = tokenJson.access_token;
            if(!token) throw new Error('no access_token in exchange response');

            const authHeaders = { Authorization: `Bearer ${token}`, 'User-Agent': UA, Accept: 'application/vnd.github+json' };
            const user = await (await fetch(`${API}/user`, { headers: authHeaders })).json() as GithubUser;
            const emails = await (await fetch(`${API}/user/emails`, { headers: authHeaders })).json().catch(() => []) as GithubEmail[];
            const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) : undefined;
            const name = user.name || user.login;
            const email = primary?.email ?? `${user.id}+${user.login}@users.noreply.github.com`;

            // Token + git identity → the owner's credentials. resolveEnvFor injects them into every
            // sandbox process; GIT_AUTHOR/COMMITTER give commits an identity without a static gitconfig.
            await credentials.upsertInternal(userId, 'GITHUB_TOKEN', token);
            await credentials.upsertInternal(userId, 'GIT_AUTHOR_NAME', name);
            await credentials.upsertInternal(userId, 'GIT_AUTHOR_EMAIL', email);
            await credentials.upsertInternal(userId, 'GIT_COMMITTER_NAME', name);
            await credentials.upsertInternal(userId, 'GIT_COMMITTER_EMAIL', email);

            logger.debug('github connected', { scope: 'auth.github', userId, login: user.login });
            reply.redirect(webReturn('connected'));
        }catch(error){
            logger.error('github oauth callback failed', error, { scope: 'auth.github', userId });
            reply.redirect(webReturn('error'));
        }
    };

    app.get('/auth/github/start', start);
    app.get('/auth/github/callback', callback);
    logger.debug('github oauth routes mounted at /auth/github', { scope: 'auth.github' });
};
