import jwt from 'jsonwebtoken';
import { config } from '@/shared/config';

export interface TokenPayload{
    sub: string;
}

export default class JWTService{
    sign(userId: number): string{
        return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });
    }

    verify(token: string): TokenPayload{
        return jwt.verify(token, config.jwtSecret) as TokenPayload;
    }
}