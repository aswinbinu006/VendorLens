import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { authService } from './modules/auth/auth.service.js';
import { ingestionService } from './modules/ingestion/ingestion.service.js';
import { initScheduler, stopScheduler } from './jobs/scheduler.js';

const server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV, trustProxy: env.TRUST_PROXY }, 'API server started successfully');
  await authService.bootstrapAdmin();
  await ingestionService.cleanupStaleRuns();
  initScheduler();
});

const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, 'Graceful shutdown initiated');
  stopScheduler();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
