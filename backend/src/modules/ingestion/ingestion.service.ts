import { prisma } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';
import { type NormalizedRecord } from './adapter.js';
import { OpenFdaAdapter } from './adapters/openfda.adapter.js';
import { matchService } from '../matches/match.service.js';

export interface IngestionRunResult {
  runId: bigint;
  status: 'success' | 'partial' | 'failed';
  fetched: number;
  newRecords: number;
  updatedRecords: number;
  sourceLastUpdated: Date | null;
  error?: string | null;
}

export interface IngestOptions {
  mode?: 'incremental' | 'full';
  trigger?: 'schedule' | 'manual';
  backfillMonths?: number;
  syncWindowDays?: number;
}

const ADVISORY_LOCK_ID = 849204; // Distinct lock identifier for ingestion single-flight

export class IngestionService {
  private isLocallyLocked = false;
  private readonly openFdaAdapter: OpenFdaAdapter;

  constructor(adapter?: OpenFdaAdapter) {
    this.openFdaAdapter =
      adapter ||
      new OpenFdaAdapter({
        apiKey: env.OPENFDA_API_KEY,
      });
  }

  /**
   * Phase 4 integration hook: delegating to matchService.
   */
  async onSignalsChanged(insertedIds: bigint[], updatedIds: bigint[]): Promise<void> {
    try {
      await matchService.onSignalsChanged(insertedIds, updatedIds);
    } catch (err) {
      logger.error({ err, insertedCount: insertedIds.length, updatedCount: updatedIds.length }, 'Error during onSignalsChanged matching hook');
    }
  }

  /**
   * Phase 6 alert evaluation hook for ingestion failures.
   */
  async onFailureHook(_source: string, _runId: bigint): Promise<void> {
    // Registered in app.ts to evaluate H3 consecutive failures
  }

  setOnFailureHook(hook: (source: string, runId: bigint) => Promise<void>) {
    this.onFailureHook = hook;
  }

  /**
   * Mark any stale "running" rows from prior crashes/restarts as failed on startup
   */
  async cleanupStaleRuns(): Promise<void> {
    try {
      const result = await prisma.ingestionRun.updateMany({
        where: { status: 'running' },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: 'Server restarted while ingestion run was in progress',
        },
      });
      if (result.count > 0) {
        logger.warn({ count: result.count }, 'Marked stale running ingestion_runs as failed');
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to cleanup stale ingestion runs on startup');
    }
  }

  /**
   * Acquire single-flight lock via Postgres advisory lock and local process mutex
   */
  private async acquireLock(): Promise<boolean> {
    if (this.isLocallyLocked) {
      return false;
    }

    try {
      // Postgres advisory lock
      const result = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
        SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID});
      `;
      const acquired = result[0]?.pg_try_advisory_lock ?? false;
      if (acquired) {
        this.isLocallyLocked = true;
      }
      return acquired;
    } catch (err: any) {
      // If DB error (e.g. running in purely mocked unit test without real PG), fallback to local mutex
      logger.debug({ err: err.message }, 'Postgres advisory lock check fell back to local mutex');
      this.isLocallyLocked = true;
      return true;
    }
  }

  /**
   * Release single-flight lock
   */
  private async releaseLock(): Promise<void> {
    this.isLocallyLocked = false;
    try {
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID});
      `;
    } catch {
      // Ignore unlock errors during shutdown
    }
  }

  /**
   * Calculate date window based on mode (incremental vs full) and previous successful runs
   */
  private async calculateWindow(
    mode: 'incremental' | 'full',
    backfillMonths: number,
    syncWindowDays: number
  ): Promise<{ startDate: string; endDate: string }> {
    const now = new Date();
    const format = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };

    const endDate = format(now);

    if (mode === 'full') {
      const start = new Date(now.getTime() - backfillMonths * 30.5 * 24 * 60 * 60 * 1000);
      return { startDate: format(start), endDate };
    }

    // Incremental mode: check if any successful run exists
    const lastSuccess = await prisma.ingestionRun.findFirst({
      where: { status: 'success' },
      orderBy: { finishedAt: 'desc' },
    });

    if (!lastSuccess) {
      // First run: backfill 24 months
      const start = new Date(now.getTime() - backfillMonths * 30.5 * 24 * 60 * 60 * 1000);
      return { startDate: format(start), endDate };
    }

    // Trailing window of syncWindowDays (default 90)
    const trailingStart = new Date(now.getTime() - syncWindowDays * 24 * 60 * 60 * 1000);
    return { startDate: format(trailingStart), endDate };
  }

  /**
   * Batch upsert records with change detection in transactions of ~500
   */
  async upsertRecordsBatch(records: NormalizedRecord[]): Promise<{
    insertedIds: bigint[];
    updatedIds: bigint[];
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;
  }> {
    const insertedIds: bigint[] = [];
    const updatedIds: bigint[] = [];
    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await prisma.$transaction(
        async (tx) => {
          // Optimization: Pre-fetch all existing records in this batch in a single query
          const sourceIds = batch.map((item) => item.sourceId);
          const existingRecords = await tx.signal.findMany({
            where: {
              source: batch[0].source,
              sourceId: { in: sourceIds },
            },
            select: {
              id: true,
              sourceId: true,
              contentHash: true,
            },
          });

          const existingMap = new Map(existingRecords.map((r) => [r.sourceId, r]));

          for (const item of batch) {
            const existing = existingMap.get(item.sourceId);

            if (!existing) {
              // New record insertion
              const created = await tx.signal.create({
                data: {
                  source: item.source,
                  sourceId: item.sourceId,
                  signalType: item.signalType,
                  trust: item.trust,
                  firmName: item.firmName,
                  severityRaw: item.severityRaw,
                  severityNum: item.severityNum,
                  title: item.title,
                  summary: item.summary,
                  eventDate: item.eventDate,
                  recallInitiationDate: item.recallInitiationDate,
                  reportDate: item.reportDate,
                  country: item.country,
                  eventId: item.eventId,
                  url: item.url,
                  raw: item.raw as any,
                  contentHash: item.contentHash,
                },
                select: { id: true },
              });
              insertedIds.push(created.id);
              insertedCount++;
            } else if (existing.contentHash !== item.contentHash) {
              // Content changed -> update
              const updated = await tx.signal.update({
                where: { id: existing.id },
                data: {
                  firmName: item.firmName,
                  severityRaw: item.severityRaw,
                  severityNum: item.severityNum,
                  title: item.title,
                  summary: item.summary,
                  eventDate: item.eventDate,
                  recallInitiationDate: item.recallInitiationDate,
                  reportDate: item.reportDate,
                  country: item.country,
                  eventId: item.eventId,
                  url: item.url,
                  raw: item.raw as any,
                  contentHash: item.contentHash,
                  updatedAt: new Date(),
                },
                select: { id: true },
              });
              updatedIds.push(updated.id);
              updatedCount++;
            } else {
              // Content hash matches exactly -> unchanged
              unchangedCount++;
            }
          }
        },
        {
          maxWait: 10000,
          timeout: 60000,
        }
      );
    }

    return {
      insertedIds,
      updatedIds,
      insertedCount,
      updatedCount,
      unchangedCount,
    };
  }

  /**
   * Execute an ingestion run with single-flight locking, duplicate guards, and run tracking
   */
  async run(options: IngestOptions = {}): Promise<IngestionRunResult> {
    const mode = options.mode || 'incremental';
    const trigger = options.trigger || 'manual';
    const backfillMonths = options.backfillMonths ?? 24;
    const syncWindowDays = options.syncWindowDays ?? 90;

    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new AppError(409, 'CONFLICT', 'An ingestion run is already in progress');
    }

    let runRecord;
    try {
      runRecord = await prisma.ingestionRun.create({
        data: {
          source: this.openFdaAdapter.source,
          trigger,
          status: 'running',
          fetched: 0,
          newRecords: 0,
          updatedRecords: 0,
        },
      });
    } catch (err: any) {
      await this.releaseLock();
      throw err;
    }

    const runId = runRecord.id;
    let fetchedTotal = 0;
    let newRecordsTotal = 0;
    let updatedRecordsTotal = 0;
    let sourceLastUpdated: Date | null = null;
    let runStatus: 'success' | 'partial' | 'failed' = 'success';
    const errorNotes: string[] = [];

    // Guard (b) tracking: source_id -> content_hash in current run
    const seenSourceIds = new Map<string, string>();
    const safeRecordsToStore: NormalizedRecord[] = [];

    try {
      const { startDate, endDate } = await this.calculateWindow(
        mode,
        backfillMonths,
        syncWindowDays
      );

      logger.info(
        { runId: runId.toString(), mode, trigger, startDate, endDate },
        'Executing ingestion run'
      );

      const fetchResult = await this.openFdaAdapter.fetchWindow(
        startDate,
        endDate,
        async (chunk) => {
          fetchedTotal += chunk.length;

          for (const item of chunk) {
            // E22: Flag records stored with synthetic source_id (missing recall_number)
            if (item.sourceId.includes(':') && !item.sourceId.startsWith('D-')) {
              const e22Note = `E22 note: record missing recall_number stored with synthetic source_id "${item.sourceId}" (firm: ${item.firmName || 'Unknown'})`;
              if (!errorNotes.includes(e22Note)) {
                errorNotes.push(e22Note);
              }
            }

            const previousHash = seenSourceIds.get(item.sourceId);
            if (previousHash !== undefined) {
              if (previousHash !== item.contentHash) {
                // Guard (b): same source_id twice with different content_hash
                const warnMsg = `Guard (b) triggered: duplicate source_id "${item.sourceId}" observed with conflicting content_hash. Preserving first record.`;
                logger.warn({ sourceId: item.sourceId }, warnMsg);
                if (!errorNotes.includes(warnMsg)) {
                  errorNotes.push(warnMsg);
                }
                // Do not let second record overwrite first
                continue;
              }
            } else {
              seenSourceIds.set(item.sourceId, item.contentHash);
              safeRecordsToStore.push(item);
            }
          }
        }
      );

      sourceLastUpdated = fetchResult.sourceLastUpdated;

      // Upsert safe records in batches
      const upsertResult = await this.upsertRecordsBatch(safeRecordsToStore);
      newRecordsTotal = upsertResult.insertedCount;
      updatedRecordsTotal = upsertResult.updatedCount;

      // Trigger Phase 4 hook
      if (upsertResult.insertedIds.length > 0 || upsertResult.updatedIds.length > 0) {
        await this.onSignalsChanged(upsertResult.insertedIds, upsertResult.updatedIds);
      }

      runStatus = errorNotes.length > 0 ? 'partial' : 'success';
    } catch (err: any) {
      runStatus = 'failed';
      const cleanError = err.message || 'Unknown ingestion failure';
      errorNotes.push(cleanError);
      logger.error({ runId: runId.toString(), err: cleanError }, 'Ingestion run failed');
    } finally {
      await this.releaseLock();

      const finalErrorMessage = errorNotes.length > 0 ? errorNotes.join('; ') : null;

      try {
        await prisma.ingestionRun.update({
          where: { id: runId },
          data: {
            status: runStatus,
            finishedAt: new Date(),
            fetched: fetchedTotal,
            newRecords: newRecordsTotal,
            updatedRecords: updatedRecordsTotal,
            sourceLastUpdated,
            error: finalErrorMessage,
          },
        });
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to record final ingestion_runs status');
      }

      if (runStatus === 'failed') {
        try {
          await this.onFailureHook('openfda_enforcement', runId);
        } catch (hErr) {
          logger.error({ err: hErr }, 'Error executing onFailureHook for alert evaluation');
        }
      }
    }

    return {
      runId,
      status: runStatus,
      fetched: fetchedTotal,
      newRecords: newRecordsTotal,
      updatedRecords: updatedRecordsTotal,
      sourceLastUpdated,
      error: errorNotes.length > 0 ? errorNotes.join('; ') : null,
    };
  }

  /**
   * Paginated list of ingestion runs, newest first
   */
  async listRuns(page = 1, pageSize = 25) {
    const skip = (page - 1) * pageSize;
    const [total, runs] = await Promise.all([
      prisma.ingestionRun.count(),
      prisma.ingestionRun.findMany({
        skip,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return {
      data: runs.map((r) => ({
        id: Number(r.id),
        source: r.source,
        trigger: r.trigger as 'schedule' | 'manual',
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
        status: r.status,
        fetched: r.fetched,
        newRecords: r.newRecords,
        updatedRecords: r.updatedRecords,
        sourceLastUpdated: r.sourceLastUpdated ? r.sourceLastUpdated.toISOString() : null,
        error: r.error,
      })),
      page,
      pageSize,
      total,
    };
  }
}

export const ingestionService = new IngestionService();