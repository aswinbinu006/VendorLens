import { prisma } from '../../config/db.js';
import type {
  DashboardSummary,
  RiskLevel,
  AlertStatus,
} from '../../types/index.js';

let cachedSummary: { data: DashboardSummary; cachedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000;

export interface GetSummaryParams {
  refresh?: boolean; // Optional flag to force refresh
}

/**
 * Service for dashboard statistics and analytics
 */
export const dashboardService = {
  /**
   * Invalidate the in-memory cache (useful for test isolation)
   */
  clearCache(): void {
    cachedSummary = null;
  },

  /**
   * Get comprehensive dashboard summary with 30s cache TTL
   */
  async getSummary(params: GetSummaryParams = {}): Promise<DashboardSummary> {
    if (!params.refresh && cachedSummary && (Date.now() - cachedSummary.cachedAt) < CACHE_TTL_MS) {
      return cachedSummary.data;
    }
    // Use transaction to fetch all summary data in one database roundtrip
    const result = await prisma.$transaction(async (tx) => {
      // 1. Total vendors count
      const totalVendors = await tx.vendor.count();

      // 2. New alerts (status: 'new')
      const newAlerts = await tx.alert.count({
        where: { status: 'new' as AlertStatus },
      });

      // 2b. Pending matches count
      const pendingMatches = await tx.signalMatch.count({
        where: { status: 'pending' },
      });

      // 3. High or critical vendors (level: 'high' or 'critical')
      const highOrCriticalVendors = await tx.vendor.count({
        where: {
          OR: [
            { currentLevel: 'high' as RiskLevel },
            { currentLevel: 'critical' as RiskLevel },
          ],
        },
      });

      // 4. Risk level distribution
      const [
        lowCount,
        mediumCount,
        highCount,
        criticalCount,
      ] = await Promise.all([
        tx.vendor.count({
          where: { currentLevel: 'low' as RiskLevel },
        }),
        tx.vendor.count({
          where: { currentLevel: 'medium' as RiskLevel },
        }),
        tx.vendor.count({
          where: { currentLevel: 'high' as RiskLevel },
        }),
        tx.vendor.count({
          where: { currentLevel: 'critical' as RiskLevel },
        }),
      ]);

      // 5. Top risky vendors (ordered by score descending, limit 10)
      const topRiskyVendors = await tx.vendor.findMany({
        where: { currentScore: { not: null } },
        orderBy: { currentScore: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          country: true,
          category: true,
          criticality: true,
          currentScore: true,
          currentLevel: true,
          scoredAt: true,
        },
      });

      // 6. Latest alerts with enhanced details (ordered by createdAt descending, limit 10)
      const latestAlerts = await tx.alert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
          signal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return {
        totalVendors,
        newAlerts,
        pendingMatches,
        highOrCriticalVendors,
        lowCount,
        mediumCount,
        highCount,
        criticalCount,
        topRiskyVendors,
        latestAlerts,
        isNewQuery: !params.refresh,
      };
    });

    const summary = await this.mapToDashboardSummary(result);
    cachedSummary = { data: summary, cachedAt: Date.now() };
    return summary;
  },

  /**
   * Map database results to dashboard summary DTO
   */
  async mapToDashboardSummary(
    result: any
  ): Promise<DashboardSummary> {
    const { totalVendors, newAlerts, pendingMatches, highOrCriticalVendors } = result;

    // Risk level distribution from counts
    const distribution = {
      low: result.lowCount,
      medium: result.mediumCount,
      high: result.highCount,
      critical: result.criticalCount,
    };

    // Find last successful ingestion run or scored vendor to determine lastDataRefresh
    const [lastRun, lastScoredVendor] = await Promise.all([
      prisma.ingestionRun.findFirst({
        where: { status: 'success' },
        orderBy: { finishedAt: 'desc' },
        select: { finishedAt: true },
      }),
      prisma.vendor.findFirst({
        where: { currentScore: { not: null } },
        orderBy: { scoredAt: 'desc' },
        select: { scoredAt: true },
      }),
    ]);

    const runDate = lastRun?.finishedAt?.getTime() ?? 0;
    const vendorDate = lastScoredVendor?.scoredAt?.getTime() ?? 0;
    const latestTime = Math.max(runDate, vendorDate);

    const now = new Date();
    const lastDataRefresh = latestTime > 0 ? new Date(latestTime).toISOString() : null;

    // Determine if data is stale (overdue > 36h per FLAGGING-LOGIC.md and E12)
    const isStale =
      lastDataRefresh === null ||
      (now.getTime() - new Date(lastDataRefresh).getTime()) >
        1000 * 60 * 60 * 36;

    return {
      totalVendors,
      newAlerts,
      pendingMatches: pendingMatches ?? 0,
      highOrCriticalVendors,
      lastDataRefresh,
      isStale,
      newsEnabled: false,
      distribution,
      topRiskyVendors: result.topRiskyVendors.map((v: any) => ({
        id: Number(v.id),
        name: v.name,
        country: v.country,
        category: v.category,
        criticality: v.criticality,
        currentScore: v.currentScore,
        currentLevel: v.currentLevel,
        scoredAt: v.scoredAt ? v.scoredAt.toISOString() : null,
      })),
      latestAlerts: result.latestAlerts.map((a: any) => ({
        id: Number(a.id),
        vendorId: a.vendorId ? Number(a.vendorId) : null,
        vendorName: a.vendor?.name ?? null,
        signalId: a.signalId ? Number(a.signalId) : null,
        kind: a.kind,
        level: a.level,
        message: a.message,
        dedupeKey: a.dedupeKey,
        status: a.status,
        note: a.note,
        createdAt: a.createdAt.toISOString(),
        reviewedBy: a.reviewedBy ? Number(a.reviewedBy) : null,
        reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
        // Derive sourceUrl from the signal if available
        sourceUrl:
          a.signal?.title && a.signal?.sourceId
            ? `https://fda.gov/data/ingestion/signal/${a.signal.sourceId}`
            : null,
      })),
    };
  }
};