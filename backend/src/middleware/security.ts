import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';

export function requireFetchHeader(req: Request, _res: Response, next: NextFunction) {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method.toUpperCase())) {
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith !== 'fetch') {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'CSRF protection: mutating requests must include header "X-Requested-With: fetch"'
        )
      );
    }
  }
  next();
}
