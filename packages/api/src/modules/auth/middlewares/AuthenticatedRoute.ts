import { MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import JWTService from '../services/JWTService';

export const AuthenticatedRoute: MiddlewareFn = (req) => {
    const jwt = new JWTService();

    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')){
        throw AuthError.Unauthorized();
    }

    try{
        const { sub } = jwt.verify(header.slice('Bearer '.length).trim());
        req.principal = { userId: Number(sub) };
    }catch{
        throw AuthError.InvalidToken();
    }
};
