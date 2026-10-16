import rateLimit from 'express-rate-limit';

// Standard error handler conforming to docs/06
const rateLimitHandler = (_req: any, res: any) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this address. Please try again later.',
    },
  });
};

// Global API rate limit: 100 requests per minute
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Stricter limiter on login to protect against credential guessing (docs/10): 5 requests per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// Stricter limiter on manual ingestion run: 5 requests per 10 minutes (Phase 3 spec)
export const ingestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
