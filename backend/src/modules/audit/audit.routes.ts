import { Router } from 'express';
import { z } from 'zod';
import { auditService } from './audit.service.js';
import { authenticate } from '../auth/auth.middleware.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

const listAuditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().max(100).optional(),
    entity: z.string().max(100).optional(),
    userId: z.coerce.number().int().positive().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

/**
 * GET /api/v1/audit-log
 * Filterable, paginated audit trail.
 */
auditRouter.get('/', async (req, res, next) => {
  try {
    const query = listAuditLogQuerySchema.parse(req.query);
    const result = await auditService.list(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
