import { Router } from 'express';
import { z } from 'zod';
import { ingestionService } from './ingestion.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requireFetchHeader } from '../../middleware/security.js';
import { ingestLimiter } from '../../middleware/rate-limit.js';
import { auditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.js';

const triggerRunSchema = z
  .object({
    mode: z.enum(['incremental', 'full']).default('incremental'),
  })
  .strict(); // Reject unknown fields per docs/06

const listRunsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export const ingestionRouter = Router();

// All ingestion endpoints require authentication
ingestionRouter.use(authenticate);

/**
 * POST /api/v1/ingest/run
 * Trigger manual ingestion run in background.
 * Returns 202 Accepted { runId: string } or 409 Conflict if a run is already executing.
 */
ingestionRouter.post(
  '/run',
  requireFetchHeader,
  ingestLimiter,
  async (req, res, next) => {
    try {
      const { mode } = triggerRunSchema.parse(req.body || {});

      // Audit log the trigger attempt
      await auditService.log({
        userId: req.user?.id,
        action: 'ingest:trigger',
        entity: 'ingestion_runs',
        details: { mode, userEmail: req.user?.email },
      });

      // Launch background execution
      // Note: ingestionService.run acquires advisory lock immediately.
      // If lock fails, it throws AppError(409).
      // We start it and return 202 with the run ID.
      let runIdString: string | null = null;

      // Start run in background
      const runPromise = ingestionService.run({
        mode,
        trigger: 'manual',
      });

      // Give synchronous check a brief window to capture lock conflict (409) or run creation
      const earlyResult = await Promise.race([
        runPromise,
        new Promise<'PENDING'>((resolve) => setTimeout(() => resolve('PENDING'), 150)),
      ]);

      if (earlyResult !== 'PENDING') {
        runIdString = earlyResult.runId.toString();
      } else {
        // Query latest running run to return runId immediately
        const activeRun = await (await import('../../config/db.js')).prisma.ingestionRun.findFirst({
          where: { status: 'running' },
          orderBy: { startedAt: 'desc' },
          select: { id: true },
        });
        runIdString = activeRun?.id ? activeRun.id.toString() : 'in-progress';
      }

      return res.status(202).json({ runId: runIdString });
    } catch (err: any) {
      if (err instanceof AppError) {
        return next(err);
      }
      return next(err);
    }
  }
);

/**
 * GET /api/v1/ingestion-runs
 * Paginated list of ingestion runs, newest first
 */
export const ingestionRunsRouter = Router();
ingestionRunsRouter.use(authenticate);

ingestionRunsRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = listRunsQuerySchema.parse(req.query);
    const result = await ingestionService.listRuns(page, pageSize);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});
