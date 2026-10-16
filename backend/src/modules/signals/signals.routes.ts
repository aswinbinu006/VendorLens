import { Router } from 'express';
import { z } from 'zod';
import { getAllSignals, getSignalById } from './signals.service.js';

export const signalsRouter = Router();

const querySchema = z.object({
  type: z.enum(['recall', 'news']).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().max(100).optional(),
});

/**
 * GET /api/v1/signals
 * Lists live ingested regulatory signals with optional type and eventDate filters.
 */
signalsRouter.get('/', async (req, res, next) => {
  try {
    const result = querySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.errors,
      });
      return;
    }

    const { type, eventDate, page = 1, pageSize = 10 } = result.data;
    const signalsResult = await getAllSignals({ type, eventDate }, page, pageSize);
    res.json(signalsResult);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/signals/:id
 * Retrieves a single signal by its numeric id.
 */
signalsRouter.get('/:id', async (req, res, next) => {
  try {
    const paramsSchema = z.object({
      id: z.coerce.number(),
    });

    const result = paramsSchema.safeParse({ id: req.params.id });
    if (!result.success) {
      res.status(400).json({ error: 'Invalid signal id' });
      return;
    }

    const signal = await getSignalById(result.data.id);
    if (!signal) {
      res.status(404).json({ error: 'Signal not found' });
      return;
    }

    res.json(signal);
  } catch (err) {
    next(err);
  }
});

export default signalsRouter;