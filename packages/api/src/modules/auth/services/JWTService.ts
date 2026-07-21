import jwt from 'jsonwebtoken';
import { config } from '@/shared/config';

export interface TokenPayload{
    sub: string;
}

export interface CodespacePayload{
    userId: number;
    projectId: number;
    ownerId: number;
    containerId: string;
}

export default class JWTService{
    sign(userId: number): string{
        return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });
    }

    verify(token: string): TokenPayload{
        return jwt.verify(token, config.jwtSecret) as TokenPayload;
    }

    /**
     * Short-lived, project-scoped token for the codespace proxy. It rides in the iframe URL
     * and is exchanged for an httpOnly cookie, so the TTL is deliberately tiny and the scope
     * claim keeps a normal session token from ever being usable as a codespace key.
     */
    signCodespace(payload: CodespacePayload): string{
        return jwt.sign({
            sub: String(payload.userId),
            scope: 'codespace',
            projectId: payload.projectId,
            ownerId: payload.ownerId,
            containerId: payload.containerId
        }, config.jwtSecret, { expiresIn: '2m' });
    }

    /**
     * Short-lived state token for the GitHub OAuth round-trip. Carries the initiating user so the
     * public callback can attach the minted access token to the right account, and doubles as the
     * CSRF `state` (a forged callback can't produce a validly-signed state for a real user).
     */
    signGithubState(userId: number): string{
        return jwt.sign({ sub: String(userId), scope: 'github-oauth' }, config.jwtSecret, { expiresIn: '10m' });
    }

    verifyGithubState(token: string): number{
        const payload = jwt.verify(token, config.jwtSecret) as TokenPayload & { scope?: string };
        if(payload.scope !== 'github-oauth') throw new Error('not a github-oauth state');
        return Number(payload.sub);
    }

    verifyCodespace(token: string): CodespacePayload{
        const payload = jwt.verify(token, config.jwtSecret) as TokenPayload & {
            scope?: string; projectId?: number; ownerId?: number; containerId?: string;
        };
        if(payload.scope !== 'codespace' || typeof payload.projectId !== 'number'
            || typeof payload.ownerId !== 'number' || typeof payload.containerId !== 'string'){
            throw new Error('not a codespace token');
        }
        return {
            userId: Number(payload.sub),
            projectId: payload.projectId,
            ownerId: payload.ownerId,
            containerId: payload.containerId
        };
    }
}