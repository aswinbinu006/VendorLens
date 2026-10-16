import type { Request, Response, NextFunction } from 'express';
import { authService, AUTH_COOKIE_NAME } from './auth.service.js';
import { AppError } from '../../middleware/error.js';

export interface AuthenticatedUser {
  id: bigint;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  let token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }

  try {
    const payload = authService.verifyToken(token);
    const userIdStr = payload.userId || (payload as any).sub;
    if (!userIdStr) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid token payload'));
    }
    req.user = {
      id: BigInt(userIdStr),
      email: payload.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}
