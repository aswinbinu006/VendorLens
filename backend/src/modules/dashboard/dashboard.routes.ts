import { Router } from 'express';
import { z } from 'zod';
import { dashboardService } from './dashboard.service.js';
import { authenticate } from '../auth/auth.middleware.js';

const summaryQuerySchema = z
  .object({
    refresh: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => val === true || val === 'true')
      .optional(),
  })
  .strict();

export const dashboardRouter = Router();

// All dashboard endpoints require authentication
dashboardRouter.use(authenticate);

/**
 * GET /api/v1/dashboard/summary
 * Get comprehensive dashboard summary with risk distribution, top risky vendors, and alerts
 */
dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    // Validate request query
    const params = summaryQuerySchema.parse(req.query);

    // Get dashboard summary
    const summary = await dashboardService.getSummary(params, req.user?.id);

    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});