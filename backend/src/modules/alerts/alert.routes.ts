import { Router } from 'express';
import { z } from 'zod';
import { alertService } from './alert.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requireFetchHeader } from '../../middleware/security.js';
import { AppError } from '../../middleware/error.js';
import type { AlertKind, AlertStatus, RiskLevel } from '../../types/index.js';

export const alertsRouter = Router();
export const alertRouter = alertsRouter;

alertsRouter.use(authenticate);

const listAlertsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    status: z.enum(['new', 'reviewed', 'dismissed']).optional(),
    level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    kind: z
      .enum([
        'new_official_signal',
        'class_i_recall',
        'level_increase',
        'news_cluster',
        'ingestion_failure',
      ])
      .optional(),
    vendorId: z.coerce.number().int().positive().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

const updateAlertSchema = z
  .object({
    status: z.enum(['reviewed', 'dismissed']),
    note: z.string().max(1000).optional(),
  })
  .strict();

/**
 * GET /api/v1/alerts
 * List alerts with pagination and filters.
 */
alertsRouter.get('/', async (req, res, next) => {
  try {
    const query = listAlertsQuerySchema.parse(req.query);
    const result = await alertService.listAlerts({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status as AlertStatus | undefined,
      level: query.level as RiskLevel | undefined,
      kind: query.kind as AlertKind | undefined,
      vendorId: query.vendorId,
      from: query.from,
      to: query.to,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/alerts/:id
 * Mark alert as reviewed or dismissed with optional note.
 * Returns 409 CONFLICT if already reviewed or dismissed.
 */
alertsRouter.patch('/:id', requireFetchHeader, async (req, res, next) => {
  try {
    const rawId = req.params.id;
    if (!rawId || !/^\d+$/.test(rawId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid alert ID format');
    }
    const id = BigInt(rawId);
    const body = updateAlertSchema.parse(req.body);

    const updated = await alertService.updateAlertStatus(
      id,
      body.status,
      body.note,
      req.user?.id,
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
});