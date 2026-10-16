import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env as defaultEnv, type EnvConfig } from './config/env.js';
import { httpLogger } from './config/logger.js';
import { globalLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { vendorRouter } from './modules/vendors/vendor.routes.js';
import { matchRouter, matchService } from './modules/matches/index.js';
import { dashboardRouter } from './modules/dashboard/index.js';
import { alertRouter, alertService } from './modules/alerts/index.js';
import { ingestionRouter, ingestionRunsRouter, ingestionService } from './modules/ingestion/index.js';
import { scoringRouter, scoringService } from './modules/scoring/index.js';
import { fuzzyConfigRouter } from './modules/fuzzy-config/index.js';
import { auditRouter } from './modules/audit/index.js';
import { prisma } from './config/db.js';

// Wire Phase 4 matchService scoring hook to Phase 5 scoringService
matchService.setScoringHook(async (vendorIds) => {
  await scoringService.rescoreVendors(vendorIds);
});

// Wire Phase 4 matchService signal alert hook to Phase 6 alertService (H1 & H2)
matchService.setSignalAlertHook(async (vendorId, signalId) => {
  await alertService.evaluateSignalAlerts(vendorId, signalId);
});

// Wire Phase 5 scoringService alert hook to Phase 6 alertService (S1: Level increase)
scoringService.setAlertHook(async (vendorIds) => {
  for (const vId of vendorIds) {
    const latestScore = await prisma.riskScore.findFirst({
      where: { vendorId: vId },
      orderBy: { computedAt: 'desc' },
      select: { id: true, score: true, level: true },
    });
    if (latestScore) {
      await alertService.evaluateScoreAlert(vId, latestScore.score, latestScore.level as any, latestScore.id);
    }
  }
});

// Wire Phase 3 ingestionService failure hook to Phase 6 alertService (H3: Ingestion failure)
ingestionService.setOnFailureHook(async (source, runId) => {
  await alertService.evaluateIngestionFailures(source, runId);
});

export function createApp(customEnv?: Partial<EnvConfig>): Express {
  const config = { ...defaultEnv, ...customEnv };
  const app = express();

  // E11: Apply TRUST_PROXY to Express "trust proxy"
  // Default is false (ignores X-Forwarded-For); or number of proxy hops (e.g. 1 on Render/Railway)
  app.set('trust proxy', config.TRUST_PROXY);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Strict CORS Allowlist
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Logging with request ID
  app.use(httpLogger);

  // Global rate limiter
  app.use(globalLimiter);

  // Health and Readiness probes (no auth needed)
  const healthHandler = (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  };
  const readyHandler = (_req: any, res: any) => {
    res.status(200).json({ status: 'ready', database: 'connected' });
  };

  app.get('/health', healthHandler);
  app.get('/ready', readyHandler);
  app.get('/api/v1/health', healthHandler);
  app.get('/api/v1/ready', readyHandler);

  // API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/vendors', vendorRouter);
  app.use('/api/v1/matches', matchRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/alerts', alertRouter);
  app.use('/api/v1/ingest', ingestionRouter);
  app.use('/api/v1/ingestion-runs', ingestionRunsRouter);
  app.use('/api/v1/scoring', scoringRouter);
  app.use('/api/v1/fuzzy-config', fuzzyConfigRouter);
  app.use('/api/v1/audit-log', auditRouter);
  // Also mount top-level aliases per specs
  app.use('/alerts', alertRouter);
  app.use('/ingest', ingestionRouter);
  app.use('/ingestion-runs', ingestionRunsRouter);
  app.use('/scoring', scoringRouter);
  app.use('/fuzzy-config', fuzzyConfigRouter);
  app.use('/audit-log', auditRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
