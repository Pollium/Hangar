import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Agent tokens are `<agentId>.<secret>`: the id makes lookup O(1), the secret is verified against
 * a stored SHA-256 hash. Only the hash is persisted; the plaintext is shown once at creation.
 */
export const generateSecret = (): string => randomBytes(24).toString('base64url');

export const hashSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');

export const composeToken = (agentId: number, secret: string): string => `${agentId}.${secret}`;

export const parseToken = (token: string): { agentId: number; secret: string } | null => {
    const dot = token.indexOf('.');
    if(dot <= 0) return null;
    const agentId = Number(token.slice(0, dot));
    const secret = token.slice(dot + 1);
    if(!Number.isInteger(agentId) || !secret) return null;
    return { agentId, secret };
};

export const secretMatches = (secret: string, expectedHash: string): boolean => {
    const actual = Buffer.from(hashSecret(secret));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
};
