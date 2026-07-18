import { MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import JWTService from '../services/JWTService';

export const SocketAuthenticatedRoute: MiddlewareFn = (req) => {
    const token = tokenFromSubprotocol(req.headers['sec-websocket-protocol']) ?? tokenFromQuery(req.query);
    if(!token) throw AuthError.Unauthorized();

    try{
        const { sub } = new JWTService().verify(token);
        req.principal = { userId: Number(sub) };
    }catch{
        throw AuthError.InvalidToken();
    }
};

const tokenFromSubprotocol = (header: string | undefined): string | undefined => {
    const token = header?.split(',')[0]?.trim();
    return token || undefined;
};

const tokenFromQuery = (query: unknown): string | undefined => {
    const token = (query as { token?: string }).token?.trim();
    return token || undefined;
};
