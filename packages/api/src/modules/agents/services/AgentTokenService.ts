import { randomBytes, createHash, timingSafeEqual } from 'crypto';

export interface ParsedToken{
    agentId: number;
    secret: string;
}

/**
 * Agent tokens are `<agentId>.<secret>`: the id makes lookup O(1), the secret is verified against
 * a stored SHA-256 hash. Only the hash is persisted; the plaintext is shown once at creation.
 */
export default class AgentTokenService{
    /** Random secret, base64url so it is safe inside a token string and a shell command. */
    generateSecret(): string{
        return randomBytes(24).toString('base64url');
    }

    hashSecret(secret: string): string{
        return createHash('sha256').update(secret).digest('hex');
    }

    composeToken(agentId: number, secret: string): string{
        return `${agentId}.${secret}`;
    }

    parseToken(token: string): ParsedToken | null{
        const dot = token.indexOf('.');
        if(dot <= 0) return null;
        const agentId = Number(token.slice(0, dot));
        const secret = token.slice(dot + 1);
        if(!Number.isInteger(agentId) || !secret) return null;
        return { agentId, secret };
    }

    /** Recompute the hash of a presented secret and compare it in constant time. */
    secretMatches(secret: string, expectedHash: string): boolean{
        const actual = Buffer.from(this.hashSecret(secret));
        const expected = Buffer.from(expectedHash);
        return actual.length === expected.length && timingSafeEqual(actual, expected);
    }
}
