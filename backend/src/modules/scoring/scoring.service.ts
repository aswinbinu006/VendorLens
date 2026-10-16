import { prisma } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { score } from '../../fuzzy/engine.js';
import type { FuzzyConfig, FuzzyInputs, FuzzyScoreResult } from '../../fuzzy/types.js';
import { DEFAULT_FUZZY_CONFIG } from '../fuzzy-config/fuzzy-config.service.js';

/**
 * E16: News monitoring provider function.
 * Documents that news monitoring is not enabled in this build and returns 0.
 */
export function getNewsSignal(_vendorId: bigint): number {
  return 0.0;
}

export const scoringService = {
  /**
   * Alert evaluation hook for Phase 6.
   */
  alertHook: async (_vendorIds: bigint[]): Promise<void> => {
    // Phase 6 alert service hooks in here
  },

  setAlertHook(hook: (vendorIds: bigint[]) => Promise<void>) {
    this.alertHook = hook;
  },

  /**
   * Retrieves active fuzzy configuration from database or falls back to DEFAULT_FUZZY_CONFIG.
   */
  async getActiveConfig(): Promise<FuzzyConfig> {
    const row = await prisma.fuzzyConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (row && row.config) {
      return row.config as unknown as FuzzyConfig;
    }

    return DEFAULT_FUZZY_CONFIG as unknown as FuzzyConfig;
  },

  /**
   * Compute score for a single vendor given current signals and vendor state.
   */
  async computeVendorScore(vendorId: bigint, config: FuzzyConfig): Promise<FuzzyScoreResult | null> {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) return null;

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // E13 & E15: official signals with match status auto or confirmed within the last 12 months by report_date
    const matches = await prisma.signalMatch.findMany({
      where: {
        vendorId,
        status: { in: ['auto', 'confirmed'] },
        signal: {
          trust: 'official',
          reportDate: {
            gte: twelveMonthsAgo,
          },
        },
      },
      include: {
        signal: {
          select: {
            id: true,
            sourceId: true,
            eventId: true,
            severityNum: true,
            reportDate: true,
          },
        },
      },
    });

    const signals = matches.map((m) => m.signal);

    // E13: recalls_12m counts DISTINCT event_id (fall back to source_id when event_id is missing)
    const distinctEvents = new Set(signals.map((s) => s.eventId || s.sourceId));
    const recalls12m = distinctEvents.size;

    // E13: worst_class is the max severityNum over those signals, 0 if none
    const worstClass =
      signals.length > 0
        ? Math.max(...signals.map((s) => s.severityNum ?? 0))
        : 0;

    // E15: days_since_latest uses report_date (the date the information became knowable), cap at 730
    let daysSinceLatest = 730;
    if (signals.length > 0) {
      const validDates = signals
        .map((s) => s.reportDate?.getTime())
        .filter((t): t is number => typeof t === 'number' && !isNaN(t));

      if (validDates.length > 0) {
        const latestDateMs = Math.max(...validDates);
        const diffMs = now.getTime() - latestDateMs;
        const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
        daysSinceLatest = Math.min(730, diffDays);
      }
    }

    const newsSignal = getNewsSignal(vendorId);
    const criticality = vendor.criticality || 3;

    const fuzzyInputs: FuzzyInputs = {
      recalls12m,
      worstClass,
      daysSinceLatest,
      newsSignal,
      criticality,
    };

    return score(fuzzyInputs, config);
  },

  /**
   * Rescores a set of vendors and persists changes when rounded score or level changes.
   */
  async rescoreVendors(vendorIds: bigint[]): Promise<void> {
    const uniqueIds = Array.from(new Set(vendorIds));
    if (uniqueIds.length === 0) return;

    const config = await this.getActiveConfig();
    const scoredVendorIds: bigint[] = [];

    for (const vendorId of uniqueIds) {
      try {
        const result = await this.computeVendorScore(vendorId, config);
        if (!result) continue;

        await prisma.$transaction(async (tx) => {
          // Check latest risk_scores row
          const latestRow = await tx.riskScore.findFirst({
            where: { vendorId },
            orderBy: { computedAt: 'desc' },
          });

          const scoreChanged =
            !latestRow ||
            Math.abs(latestRow.score - result.score) >= 0.05 ||
            latestRow.level !== result.level ||
            latestRow.configVersion !== result.configVersion;

          if (scoreChanged) {
            await tx.riskScore.create({
              data: {
                vendorId,
                score: result.score,
                level: result.level,
                configVersion: result.configVersion,
                inputs: result.inputs as any,
                firedRules: result.firedRules as any,
              },
            });
          }

          // Always update current score & level on vendor
          await tx.vendor.update({
            where: { id: vendorId },
            data: {
              currentScore: result.score,
              currentLevel: result.level,
              scoredAt: new Date(),
            },
          });
        });

        scoredVendorIds.push(vendorId);
      } catch (err) {
        logger.error({ err, vendorId: vendorId.toString() }, 'Error rescoring vendor');
      }
    }

    if (scoredVendorIds.length > 0) {
      await this.alertHook(scoredVendorIds);
    }
  },

  /**
   * Rescores all vendors in the database (e.g., at end of ingestion run or via manual trigger).
   */
  async rescoreAllVendors(): Promise<number> {
    const vendors = await prisma.vendor.findMany({
      select: { id: true },
    });

    const vendorIds = vendors.map((v) => v.id);
    await this.rescoreVendors(vendorIds);
    return vendorIds.length;
  },
};
