import { Router } from 'express';
import { fuzzyConfigService } from './fuzzy-config.service.js';
import { authenticate } from '../auth/auth.middleware.js';
import { AppError } from '../../middleware/error.js';

export const fuzzyConfigRouter = Router();

// All fuzzy-config endpoints require authentication
fuzzyConfigRouter.use(authenticate);

/**
 * GET /api/v1/fuzzy-config
 * Get current fuzzy configuration (creates default if none exists)
 */
fuzzyConfigRouter.get('/', async (_req, res, next) => {
  try {
    const config = await fuzzyConfigService.getConfig();
    res.status(200).json(config);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/fuzzy-config
 * Update fuzzy configuration
 * Requires config data matching FuzzyConfigData schema
 */
fuzzyConfigRouter.put('/', async (req, res, next) => {
  try {
    // Note: We could add Zod validation here for the full FuzzyConfigData structure,
    // but for now we trust the frontend to send valid data based on the API contract.
    // In production, you'd want to validate the incoming config structure.
    const configData = req.body;

    // Basic sanity check: ensure we got an object
    if (!configData || typeof configData !== 'object') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid configuration data');
    }

    const config = await fuzzyConfigService.updateConfig(configData);
    res.status(200).json(config);
  } catch (err) {
    next(err);
  }
});