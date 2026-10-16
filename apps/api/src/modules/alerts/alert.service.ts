import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/error.js';
import { auditService } from '../audit/audit.service.js';
import { alertNotifier } from './notifier.js';
import type { AlertItem, AlertKind, AlertStatus, RiskLevel } from '@vrm/types';

export interface ListAlertsParams {
  page?: number;
  pageSize?: number;
  status?: AlertStatus;
  level?: RiskLevel;
  kind?: AlertKind;
  vendorId?: number;
  from?: string;
  to?: string;
}

const LEVEL_RANK: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const alertService = {
  /**
   * H1 & H2: Evaluate recall signals matched to a vendor.
   * E14: Signals with reportDate older than ALERT_RECENCY_DAYS do NOT trigger alerts.
   */
  async evaluateSignalAlerts(vendorId: bigint, signalId: bigint): Promise<void> {
    try {
      // 1. Check match status
      const match = await prisma.signalMatch.findUnique({
        where: {
          signalId_vendorId: {
            signalId,
            vendorId,
          },
        },
        include: {
          vendor: { select: { id: true, name: true } },
          signal: true,
        },
      });

      if (!match || (match.status !== 'auto' && match.status !== 'confirmed')) {
        return;
      }

      const { signal, vendor } = match;

      // 2. E14: Recency suppression check
      const recencyDays = env.ALERT_RECENCY_DAYS ?? 30;
      const refDate = signal.reportDate || signal.eventDate;
      if (refDate) {
        const ageMs = Date.now() - refDate.getTime();
        const maxAgeMs = recencyDays * 86400 * 1000;
        if (ageMs > maxAgeMs) {
          logger.info(
            { vendorId: vendor.id.toString(), signalId: signal.id.toString(), refDate },
            'Alert suppressed by E14 recency check (older than ALERT_RECENCY_DAYS)',
          );
          return;
        }
      }

      // 3. Class detection
      const severityNum = signal.severityNum;
      const severityRaw = (signal.severityRaw || '').toLowerCase();

      let kind: AlertKind | null = null;
      let level: RiskLevel | null = null;
      let ruleId = '';

      if (severityNum === 3 || severityRaw.includes('class i') && !severityRaw.includes('class ii') && !severityRaw.includes('class iii')) {
        // H1: Class I recall
        kind = 'class_i_recall';
        level = 'critical';
        ruleId = 'h1:class_i';
      } else if (severityNum === 2 || severityRaw.includes('class ii')) {
        // H2: Class II recall
        kind = 'new_official_signal';
        level = 'high';
        ruleId = 'h2:class_ii';
      } else if (severityNum === 1 || severityRaw.includes('class iii')) {
        // H2: Class III recall
        kind = 'new_official_signal';
        level = 'medium';
        ruleId = 'h2:class_iii';
      }

      if (!kind || !level) {
        return;
      }

      const dedupeKey = `${ruleId}:${vendorId.toString()}:${signalId.toString()}`;
      const titleSnippet = signal.title || signal.summary || 'Regulatory enforcement action';
      const message = `${level === 'critical' ? 'Class I' : level === 'high' ? 'Class II' : 'Class III'} recall detected for ${vendor.name}: ${titleSnippet}`;

      // 4. Upsert / insert with deduplication
      try {
        const existingAlert = await prisma.alert.findUnique({
          where: { dedupeKey },
          select: { id: true },
        });
        if (existingAlert) {
          logger.debug({ dedupeKey }, 'Alert suppressed by deduplication key check');
          return;
        }

        const createdAlert = await prisma.alert.create({
          data: {
            vendorId,
            signalId,
            kind,
            level,
            message,
            dedupeKey,
            status: 'new',
          },
        });

        logger.info(
          { alertId: createdAlert.id.toString(), dedupeKey, level },
          'Created new regulatory alert',
        );

        // 5. Email dispatch for high/critical
        if (level === 'high' || level === 'critical') {
          await alertNotifier.sendEmail({
            level,
            kind,
            message,
            vendorName: vendor.name,
            dedupeKey,
            sourceUrl: signal.url,
            createdAt: createdAlert.createdAt,
          });
        }
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // Dedupe key already exists: ignore idempotently
          logger.debug({ dedupeKey }, 'Alert suppressed by deduplication key conflict');
          return;
        }
        throw err;
      }
    } catch (err) {
      logger.error({ err, vendorId: vendorId.toString(), signalId: signalId.toString() }, 'Error evaluating signal alerts');
    }
  },

  /**
   * S1: Soft rule - Evaluate risk level increases.
   * E14: The very first score computed for a vendor does NOT trigger an alert.
   */
  async evaluateScoreAlert(
    vendorId: bigint,
    newScore: number,
    newLevel: RiskLevel,
    riskScoreId: bigint,
  ): Promise<void> {
    try {
      // Find the two most recent risk score rows for this vendor
      const recentScores = await prisma.riskScore.findMany({
        where: { vendorId },
        orderBy: { computedAt: 'desc' },
        take: 2,
        select: { id: true, level: true, score: true, configVersion: true },
      });

      // E14: If only 1 score exists, it's the initial calculation -> NO alert
      if (recentScores.length < 2) {
        return;
      }

      const currentScoreRow = recentScores[0];
      const prevScoreRow = recentScores[1];
      if (!currentScoreRow || !prevScoreRow) {
        return;
      }

      // E21: When a score's config_version differs from the previous risk_scores row,
      // the level-increase alert (S1) is suppressed, because a config change is not a real change.
      if (currentScoreRow.configVersion !== prevScoreRow.configVersion) {
        logger.info(
          {
            vendorId: vendorId.toString(),
            prevVersion: prevScoreRow.configVersion,
            currentVersion: currentScoreRow.configVersion,
          },
          'E21: Suppressing S1 alert because config_version changed',
        );
        return;
      }

      const prevLevel = prevScoreRow.level as RiskLevel;

      // Check if level increased
      if (LEVEL_RANK[newLevel] > LEVEL_RANK[prevLevel]) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorId },
          select: { name: true },
        });

        const vendorName = vendor?.name || `Vendor #${vendorId.toString()}`;
        const dedupeKey = `s1:level_increase:${vendorId.toString()}:${prevLevel}_to_${newLevel}:${riskScoreId.toString()}`;
        const message = `Vendor ${vendorName} risk level increased from ${prevLevel.toUpperCase()} to ${newLevel.toUpperCase()} (score: ${newScore.toFixed(1)})`;

        try {
          const existingAlert = await prisma.alert.findUnique({
            where: { dedupeKey },
            select: { id: true },
          });
          if (existingAlert) return;

          const createdAlert = await prisma.alert.create({
            data: {
              vendorId,
              kind: 'level_increase',
              level: newLevel,
              message,
              dedupeKey,
              status: 'new',
            },
          });

          logger.info(
            { alertId: createdAlert.id.toString(), dedupeKey, level: newLevel },
            'Created risk level increase alert',
          );

          if (newLevel === 'high' || newLevel === 'critical') {
            await alertNotifier.sendEmail({
              level: newLevel,
              kind: 'level_increase',
              message,
              vendorName,
              dedupeKey,
              createdAt: createdAlert.createdAt,
            });
          }
        } catch (err: any) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return;
          }
          throw err;
        }
      }
    } catch (err) {
      logger.error({ err, vendorId: vendorId.toString() }, 'Error evaluating score alert');
    }
  },

  /**
   * H3: Hard rule - Consecutive ingestion failures (3 consecutive failed runs).
   */
  async evaluateIngestionFailures(source: string, latestRunId: bigint): Promise<void> {
    try {
      const lastRuns = await prisma.ingestionRun.findMany({
        where: { source },
        orderBy: { startedAt: 'desc' },
        take: 3,
        select: { id: true, status: true, error: true },
      });

      if (lastRuns.length >= 3 && lastRuns.every((r) => r.status === 'failed')) {
        const dedupeKey = `h3:ingestion_failure:${source}:${latestRunId.toString()}`;
        const latestError = lastRuns[0]?.error || 'Unknown error';
        const message = `3 consecutive ingestion runs failed for source ${source}. Latest error: ${latestError}`;

        try {
          const existingAlert = await prisma.alert.findUnique({
            where: { dedupeKey },
            select: { id: true },
          });
          if (existingAlert) return;

          const createdAlert = await prisma.alert.create({
            data: {
              kind: 'ingestion_failure',
              level: 'high',
              message,
              dedupeKey,
              status: 'new',
            },
          });

          logger.info({ alertId: createdAlert.id.toString(), dedupeKey }, 'Created ingestion failure system alert');

          await alertNotifier.sendEmail({
            level: 'high',
            kind: 'ingestion_failure',
            message,
            dedupeKey,
            createdAt: createdAlert.createdAt,
          });
        } catch (err: any) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return;
          }
          throw err;
        }
      }
    } catch (err) {
      logger.error({ err, source }, 'Error evaluating ingestion failure alert');
    }
  },

  /**
   * List alerts with pagination and filtering.
   */
  async listAlerts(params: ListAlertsParams = {}) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.AlertWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }
    if (params.level) {
      where.level = params.level;
    }
    if (params.kind) {
      where.kind = params.kind;
    }
    if (params.vendorId) {
      where.vendorId = BigInt(params.vendorId);
    }
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          vendor: { select: { id: true, name: true } },
          signal: { select: { id: true, url: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    const data: AlertItem[] = alerts.map((a) => ({
      id: Number(a.id),
      vendorId: a.vendorId ? Number(a.vendorId) : null,
      vendorName: a.vendor?.name || null,
      signalId: a.signalId ? Number(a.signalId) : null,
      kind: a.kind as AlertKind,
      level: a.level as RiskLevel,
      message: a.message,
      dedupeKey: a.dedupeKey,
      status: a.status as AlertStatus,
      note: a.note,
      createdAt: a.createdAt.toISOString(),
      reviewedBy: a.reviewedBy ? Number(a.reviewedBy) : null,
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
      sourceUrl: a.signal?.url || null,
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  },

  /**
   * Review or dismiss an alert.
   * Enforces 409 CONFLICT if the alert is already reviewed or dismissed.
   */
  async updateAlertStatus(
    id: bigint,
    status: 'reviewed' | 'dismissed',
    note?: string,
    userId?: bigint,
  ): Promise<AlertItem> {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        vendor: { select: { name: true } },
        signal: { select: { url: true } },
      },
    });

    if (!alert) {
      throw new AppError(404, 'NOT_FOUND', `Alert ${id} not found`);
    }

    if (alert.status !== 'new') {
      throw new AppError(409, 'CONFLICT', `Alert ${id} is already ${alert.status}`);
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status,
        note: note || null,
        reviewedBy: userId ?? null,
        reviewedAt: new Date(),
      },
      include: {
        vendor: { select: { name: true } },
        signal: { select: { url: true } },
      },
    });

    await auditService.log({
      userId,
      action: 'alert:update_status',
      entity: 'alerts',
      entityId: id.toString(),
      details: {
        previousStatus: alert.status,
        newStatus: status,
        note,
      },
    });

    return {
      id: Number(updated.id),
      vendorId: updated.vendorId ? Number(updated.vendorId) : null,
      vendorName: updated.vendor?.name || null,
      signalId: updated.signalId ? Number(updated.signalId) : null,
      kind: updated.kind as AlertKind,
      level: updated.level as RiskLevel,
      message: updated.message,
      dedupeKey: updated.dedupeKey,
      status: updated.status as AlertStatus,
      note: updated.note,
      createdAt: updated.createdAt.toISOString(),
      reviewedBy: updated.reviewedBy ? Number(updated.reviewedBy) : null,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      sourceUrl: updated.signal?.url || null,
    };
  },
};