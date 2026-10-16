import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import { vendorService } from './vendor.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { requireFetchHeader } from '../../middleware/security.js';
import { AppError } from '../../middleware/error.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024, // 1 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new AppError(422, 'VALIDATION_ERROR', 'File extension must be .csv'));
    }
    const allowedMimes = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/csv'];
    if (!allowedMimes.includes(file.mimetype) && !file.mimetype.includes('csv')) {
      return cb(new AppError(422, 'VALIDATION_ERROR', 'File content type must be CSV'));
    }
    cb(null, true);
  },
});

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    q: z.string().max(200).optional(),
    sortBy: z.enum(['score', 'name', 'createdAt', 'criticality']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

const createVendorSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
    country: z.string().trim().max(100).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    criticality: z.number().int().min(1).max(5).default(3),
    notes: z.string().trim().max(2000).nullable().optional(),
    aliases: z
      .array(z.string().trim().min(2, 'Alias must be at least 2 characters').max(200))
      .max(20, 'Maximum 20 aliases allowed')
      .optional(),
  })
  .strict();

const updateVendorSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200).optional(),
    country: z.string().trim().max(100).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    criticality: z.number().int().min(1).max(5).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    aliases: z
      .array(z.string().trim().min(2, 'Alias must be at least 2 characters').max(200))
      .max(20, 'Maximum 20 aliases allowed')
      .optional(),
  })
  .strict();

export const vendorRouter = Router();

// All vendor endpoints require authentication
vendorRouter.use(authenticate);

// GET /vendors - list with pagination, search filter, and sorting
vendorRouter.get('/', async (req, res, next) => {
  try {
    const params = listQuerySchema.parse(req.query);
    const result = await vendorService.listVendors(params);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /vendors - create vendor
vendorRouter.post('/', requireFetchHeader, async (req, res, next) => {
  try {
    const dto = createVendorSchema.parse(req.body);
    const result = await vendorService.createVendor(req.user!.id, dto);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /vendors/import - CSV multipart upload
vendorRouter.post('/import', requireFetchHeader, (req, res, next) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(422, 'VALIDATION_ERROR', 'File size exceeds maximum 1 MB limit'));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new AppError(422, 'VALIDATION_ERROR', 'No file uploaded in "file" field'));
    }

    try {
      const result = await vendorService.importVendorsFromCsv(req.user!.id, req.file.buffer);
      res.status(200).json(result);
    } catch (importErr) {
      next(importErr);
    }
  });
});

// GET /vendors/:id - get vendor by ID
vendorRouter.get('/:id', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const result = await vendorService.getVendorById(id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});

// PATCH /vendors/:id - update vendor
vendorRouter.patch('/:id', requireFetchHeader, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const dto = updateVendorSchema.parse(req.body);
    const result = await vendorService.updateVendor(req.user!.id, id, dto);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});

// DELETE /vendors/:id - delete vendor
vendorRouter.delete('/:id', requireFetchHeader, async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const result = await vendorService.deleteVendor(req.user!.id, id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});

const vendorSignalsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    trust: z.enum(['official', 'unverified']).optional(),
    matchStatus: z.enum(['auto', 'confirmed', 'pending', 'rejected']).optional(),
  })
  .strict();

// GET /vendors/:id/signals - get matched signals for vendor
vendorRouter.get('/:id/signals', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const query = vendorSignalsQuerySchema.parse(req.query);
    const result = await vendorService.getVendorSignals(id, query);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});

// GET /vendors/:id/score - get latest score details with fired rules and inputs
vendorRouter.get('/:id/score', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const result = await vendorService.getVendorLatestScore(id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});

const vendorScoreHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

// GET /vendors/:id/score-history - get score evaluation time series
vendorRouter.get('/:id/score-history', async (req, res, next) => {
  try {
    const id = BigInt(req.params.id as string);
    const query = vendorScoreHistoryQuerySchema.parse(req.query);
    const result = await vendorService.getVendorScoreHistory(id, query);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TypeError || (err as any).name === 'RangeError') {
      return next(new AppError(404, 'NOT_FOUND', `Invalid vendor ID: ${req.params.id}`));
    }
    next(err);
  }
});
