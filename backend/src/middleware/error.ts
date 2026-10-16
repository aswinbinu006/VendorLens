import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: unknown[];

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const reqId = req.headers['x-request-id'] || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, reqId, path: req.path }, 'Application internal error');
    }
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        details: err.errors.map((e) => ({
          path: e.path.map(String),
          message: e.message,
          code: e.code,
        })),
      },
    });
  }

  // Handle express-rate-limit error response if it throws
  if ((err as any).status === 429) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: err.message || 'Too many requests. Please try again later.',
      },
    });
  }

  logger.error({ err, reqId, path: req.path }, 'Unhandled server exception');

  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An internal server error occurred',
    },
  });
}
