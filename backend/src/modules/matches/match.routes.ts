/**
 * Match Routes - Express router for vendor-signal matching endpoints
 */
import { Router } from 'express';
import { z } from 'zod';
import { matchService } from './match.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { AppError } from '../../middleware/error.js';

export const matchRouter = Router();

// All match endpoints require authentication
matchRouter.use(authenticate);

// Schema for pagination query parameters
const listPendingMatchesQuerySchema = z
  .object({
    status: z.enum(['pending', 'auto', 'confirmed', 'all']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.enum(['similarityScore', 'eventDate', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

// GET /api/v1/matches/pending - List matches with optional status filter
matchRouter.get('/pending', async (req, res, next) => {
  try {
    const params = listPendingMatchesQuerySchema.parse(req.query);
    const result = await matchService.listPendingMatches(params, req.user?.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/matches/scan - Re-scan all registered vendors against all signals
matchRouter.post('/scan', async (req, res, next) => {
  try {
    const result = await matchService.scanAllMatches(req.user?.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Schema for match ID parameter
const matchIdParamSchema = z.object({
  id: z.coerce
    .bigint()
    .positive()
    .describe('Match ID must be a positive integer'),
});

// Schema for confirm/reject request body
const confirmRejectSchema = z
  .object({})
  .strict();

// POST /api/v1/matches/:id/confirm - Confirm a match
matchRouter.post('/:id/confirm', async (req, res, next) => {
  try {
    confirmRejectSchema.parse(req.body || {});
    const params = matchIdParamSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not authenticated');
    }

    const result = await matchService.confirmMatch(BigInt(params.id as any), {
      userId: BigInt(userId),
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid match ID: ${req.params.id}`));
    }
    next(err);
  }
});

// POST /api/v1/matches/:id/reject - Reject a match
matchRouter.post('/:id/reject', async (req, res, next) => {
  try {
    confirmRejectSchema.parse(req.body || {});
    const params = matchIdParamSchema.parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not authenticated');
    }

    const result = await matchService.rejectMatch(BigInt(params.id as any), {
      userId: BigInt(userId),
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid match ID: ${req.params.id}`));
    }
    next(err);
  }
});