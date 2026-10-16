import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ingestionService } from '../modules/ingestion/ingestion.service.js';

let scheduledTask: cron.ScheduledTask | null = null;

export function initScheduler(): void {
  const cronExpr = env.INGEST_CRON || '0 6 * * *';
  const ingestOnStart = process.env.INGEST_ON_START === 'true';

  if (!cron.validate(cronExpr)) {
    logger.error({ cronExpr }, 'Invalid INGEST_CRON expression. Scheduler not started.');
    return;
  }

  logger.info({ cronExpr, ingestOnStart }, 'Initializing ingestion scheduler');

  scheduledTask = cron.schedule(cronExpr, async () => {
    logger.info('Starting scheduled ingestion run via cron');
    try {
      const result = await ingestionService.run({
        mode: 'incremental',
        trigger: 'schedule',
      });
      logger.info(
        {
          runId: result.runId.toString(),
          status: result.status,
          fetched: result.fetched,
          newRecords: result.newRecords,
          updatedRecords: result.updatedRecords,
        },
        'Scheduled ingestion run completed'
      );
    } catch (err: any) {
      logger.error({ err: err.message }, 'Scheduled ingestion run failed');
    }
  });

  if (ingestOnStart) {
    logger.info('INGEST_ON_START is true; launching background ingestion on start');
    setImmediate(async () => {
      try {
        await ingestionService.run({
          mode: 'incremental',
          trigger: 'schedule',
        });
      } catch (err: any) {
        logger.error({ err: err.message }, 'Initial on-start ingestion failed');
      }
    });
  }
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('Ingestion scheduler stopped');
  }
}
