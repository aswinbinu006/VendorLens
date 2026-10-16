import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../auth/auth.middleware.js';
import { auditService } from '../audit/audit.service.js';
import { scoringService } from './scoring.service.js';
import { AppError } from '../../middleware/error.js';

export const scoringRouter = Router();

scoringRouter.use(authenticate);

// Rate limit manual rescoring: max 10 runs per 10 minutes
const rescoreLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many rescore requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

scoringRouter.post('/run', rescoreLimiter, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not authenticated');
    }

    const rescoredCount = await scoringService.rescoreAllVendors();

    await auditService.log({
      userId,
      action: 'TRIGGER_RESCORING',
      entity: 'scoring',
      details: {
        rescoredCount,
        trigger: 'manual',
      },
    });

    res.status(200).json({
      success: true,
      rescoredCount,
      message: `Rescored ${rescoredCount} vendor(s) successfully`,
    });
  } catch (err) {
    next(err);
  }
});
