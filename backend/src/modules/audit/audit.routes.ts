import { Router } from 'express';
import { z } from 'zod';
import { auditService } from './audit.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { env } from '../../config/env.js';

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
 * Super-Admin (admin@example.com) has global access across all tenants.
 * Regular company admins are strictly scoped to their own actor logs.
 */
auditRouter.get('/', async (req, res, next) => {
  try {
    const query = listAuditLogQuerySchema.parse(req.query);
    const isSuperAdmin = req.user?.email?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

    // Restrict non-super-admins to only their own actor logs
    const scopedUserId = isSuperAdmin ? query.userId : (req.user?.id ? Number(req.user.id) : undefined);

    const result = await auditService.list({
      ...query,
      userId: scopedUserId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
