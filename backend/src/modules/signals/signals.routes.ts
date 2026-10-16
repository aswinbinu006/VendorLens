import { Router } from 'express';
import { z } from 'zod';
import type { SignalItem } from '../../types/index.js';
import { getAllSignals, getSignalById } from './signals.service.js';

const router = Router();

/**
 * Query schema for pagination & filters
 * GET /api/v1/signals?type=recall&eventDate=2024-09-01&page=1&pageSize=10
 */
const querySchema = z.object({
  type: z.enum(['recall', 'news']).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().max(100).optional(),
});

/**
 * GET /api/v1/signals
 * Lists signals with optional type and eventDate filters, plus pagination.
 */
router.get('/', (req, res) => {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid query parameters',
      details: result.error.errors,
    });
    return;
  }

  const { type, eventDate, page = 1, pageSize = 10 } = result.data;

  const filters: Partial<Record<string, any>> = {};
  if (type) filters.type = type;
  if (eventDate) filters.eventDate = eventDate;

  // TODO: In production replace with real persistence logic
  const signals: SignalItem[] = getAllSignals(filters, page, pageSize);

  res.json({
    data: signals,
    page,
    pageSize,
    // In a real implementation `total` would be fetched from DB
    total: signals.length,
  });
});

/**
 * GET /api/v1/signals/:id
 * Retrieves a single signal by its numeric id.
 */
router.get('/:id', (req, res) => {
  const paramsSchema = z.object({
    id: z.coerce.number(),
  });

  const result = paramsSchema.safeParse({ id: req.params.id });
  if (!result.success) {
    res.status(400).json({ error: 'Invalid signal id' });
    return;
  }

  const signal = getSignalById(result.data.id);
  if (!signal) {
    res.status(404).json({ error: 'Signal not found' });
    return;
  }

  res.json(signal);
});

export default router;