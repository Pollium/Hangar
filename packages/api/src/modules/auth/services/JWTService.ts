import jwt from 'jsonwebtoken';
import { config } from '@/shared/config';

export interface TokenPayload{
    sub: string;
}

export interface CodespacePayload{
    userId: number;
    projectId: number;
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
    signCodespace(userId: number, projectId: number): string{
        return jwt.sign({ sub: String(userId), scope: 'codespace', projectId }, config.jwtSecret, { expiresIn: '2m' });
    }

    verifyCodespace(token: string): CodespacePayload{
        const payload = jwt.verify(token, config.jwtSecret) as TokenPayload & { scope?: string; projectId?: number };
        if(payload.scope !== 'codespace' || typeof payload.projectId !== 'number'){
            throw new Error('not a codespace token');
        }
        return { userId: Number(payload.sub), projectId: payload.projectId };
    }
}