import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';
import { auditService } from '../audit/audit.service.js';
import { matchSignalToVendors, type MatchableSignal, type MatchableVendor } from './matcher.js';

export interface ListPendingMatchesParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'similarityScore' | 'eventDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ConfirmMatchInput {
  userId: bigint;
}

export interface RejectMatchInput {
  userId: bigint;
}

export interface MatchConfirmationResult {
  success: boolean;
  rescoreTriggered: boolean;
}

export const matchService = {
  /**
   * Hook for Phase 5 scoring. Default is an asynchronous no-op until Phase 5 registers its handler.
   */
  scoringHook: async (_vendorIds: bigint[]): Promise<void> => {
    // Phase 5 scoring engine will hook in here
  },

  setScoringHook(hook: (vendorIds: bigint[]) => Promise<void>) {
    this.scoringHook = hook;
  },

  /**
   * Hook for Phase 6 alert evaluation on matched signals.
   */
  signalAlertHook: async (_vendorId: bigint, _signalId: bigint): Promise<void> => {
    // Phase 6 alert service hooks in here
  },

  setSignalAlertHook(hook: (vendorId: bigint, signalId: bigint) => Promise<void>) {
    this.signalAlertHook = hook;
  },

  /**
   * Match given signals against vendors.
   * If vendorIdFilter is provided, only matches against that single vendor (backfill).
   * E17: Never touches or overwrites existing rows (ON CONFLICT DO NOTHING).
   */
  async matchSignals(signals: MatchableSignal[], vendorIdFilter?: bigint): Promise<bigint[]> {
    if (signals.length === 0) return [];

    const vendorWhere: any = {};
    if (vendorIdFilter) {
      vendorWhere.id = vendorIdFilter;
    }

    const vendorsRaw = await prisma.vendor.findMany({
      where: vendorWhere,
      include: {
        aliases: true,
      },
    });

    if (vendorsRaw.length === 0) return [];

    const vendors: MatchableVendor[] = vendorsRaw.map((v) => ({
      id: v.id,
      name: v.name,
      normalizedName: v.normalizedName,
      country: v.country,
      aliases: v.aliases.map((a) => ({
        id: a.id,
        alias: a.alias,
        normalizedAlias: a.normalizedAlias,
      })),
    }));

    const affectedVendorIds = new Set<bigint>();
    const threshold = env.MATCH_THRESHOLD ?? 0.60;

    for (const signal of signals) {
      const candidates = matchSignalToVendors(signal, vendors, threshold);
      for (const c of candidates) {
        // E17: If row already exists, never modify or overwrite it
        const existing = await prisma.signalMatch.findUnique({
          where: {
            signalId_vendorId: {
              signalId: c.signalId,
              vendorId: c.vendorId,
            },
          },
        });

        if (!existing) {
          await prisma.signalMatch.create({
            data: {
              signalId: c.signalId,
              vendorId: c.vendorId,
              status: c.status,
              score: c.score,
            },
          });
          affectedVendorIds.add(c.vendorId);
          if (c.status === 'auto') {
            await this.signalAlertHook(c.vendorId, c.signalId);
          }
        }
      }
    }

    return Array.from(affectedVendorIds);
  },

  /**
   * Hook called when ingestion inserts or updates signals.
   * Matches new/updated signals and triggers rescore for affected vendors.
   */
  async onSignalsChanged(insertedIds: bigint[], updatedIds: bigint[]): Promise<void> {
    const allIds = Array.from(new Set([...insertedIds, ...updatedIds]));
    if (allIds.length === 0) return;

    const signalsRaw = await prisma.signal.findMany({
      where: {
        id: { in: allIds },
        firmName: { not: null },
      },
      select: {
        id: true,
        firmName: true,
        country: true,
      },
    });

    const affectedVendors = await this.matchSignals(signalsRaw);

    if (affectedVendors.length > 0) {
      await this.scoringHook(affectedVendors);
    }
  },

  /**
   * Backfill: Match a single vendor against ALL stored signals.
   * Called when a vendor is created or updated.
   */
  async backfillVendorMatches(vendorId: bigint): Promise<void> {
    const signals = await prisma.signal.findMany({
      where: {
        firmName: { not: null },
      },
      select: {
        id: true,
        firmName: true,
        country: true,
      },
    });

    await this.matchSignals(signals, vendorId);
    await this.scoringHook([vendorId]);
  },

  /**
   * List pending matches for human review with pagination and filtering.
   */
  async listPendingMatches(params: ListPendingMatchesParams = {}) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: 'pending',
    };

    let orderBy: any = {
      score: 'desc',
    };

    if (params.sortBy === 'eventDate' && params.sortOrder) {
      orderBy = { signal: { eventDate: params.sortOrder } };
    } else if (params.sortBy === 'createdAt' && params.sortOrder) {
      orderBy = { id: params.sortOrder };
    }

    const [total, items] = await Promise.all([
      prisma.signalMatch.count({ where }),
      prisma.signalMatch.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              country: true,
              category: true,
              criticality: true,
              currentScore: true,
              currentLevel: true,
            },
          },
          signal: {
            select: {
              id: true,
              source: true,
              signalType: true,
              firmName: true,
              title: true,
              summary: true,
              severityRaw: true,
              severityNum: true,
              eventDate: true,
              reportDate: true,
              country: true,
              sourceDomain: true,
              url: true,
            },
          },
        },
      }),
    ]);

    const data = items.map((m) => ({
      id: Number(m.id),
      signalId: Number(m.signalId),
      vendorId: Number(m.vendorId),
      vendorName: m.vendor.name,
      signalTitle: m.signal.title,
      signalSummary: m.signal.summary,
      firmName: m.signal.firmName,
      country: m.signal.country,
      reportDate: m.signal.reportDate?.toISOString() || null,
      classification: m.signal.severityRaw,
      severityRaw: m.signal.severityRaw,
      eventDate: m.signal.eventDate?.toISOString() || null,
      source: m.signal.source,
      url: m.signal.url,
      similarityScore: m.score,
      status: m.status,
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  },

  /**
   * Confirm a match (sets status = 'confirmed', decidedBy, decidedAt).
   */
  async confirmMatch(id: bigint, input: ConfirmMatchInput): Promise<MatchConfirmationResult> {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.signalMatch.findUnique({
        where: { id },
        include: {
          vendor: true,
          signal: true,
        },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', `Match with ID ${id} not found`);
      }

      if (existing.status !== 'pending') {
        throw new AppError(400, 'VALIDATION_ERROR', `Match ${id} is already ${existing.status}, cannot confirm`);
      }

      const updated = await tx.signalMatch.update({
        where: { id },
        data: {
          status: 'confirmed',
          decidedBy: input.userId,
          decidedAt: new Date(),
        },
        include: {
          vendor: { select: { id: true, name: true } },
          signal: { select: { id: true, title: true } },
        },
      });

      await auditService.log({
        userId: input.userId,
        action: 'CONFIRM_MATCH',
        entity: 'match',
        entityId: id.toString(),
        details: {
          vendorId: Number(updated.vendor.id),
          signalId: Number(updated.signal.id),
          vendorName: updated.vendor.name,
          signalTitle: updated.signal.title,
        },
      });

      // Trigger rescore for vendor
      await this.scoringHook([updated.vendor.id]);

      // Trigger signal alert evaluation
      await this.signalAlertHook(updated.vendor.id, updated.signal.id);

      return {
        success: true,
        rescoreTriggered: true,
      };
    });
  },

  /**
   * Reject a match (works on pending, auto, and confirmed matches per Phase 4 spec).
   * Human override: sets status = 'rejected', decidedBy, decidedAt. Never deleted.
   */
  async rejectMatch(id: bigint, input: RejectMatchInput): Promise<MatchConfirmationResult> {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.signalMatch.findUnique({
        where: { id },
        include: {
          vendor: true,
          signal: true,
        },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', `Match with ID ${id} not found`);
      }

      if (existing.status === 'rejected') {
        throw new AppError(400, 'VALIDATION_ERROR', `Match ${id} is already rejected`);
      }

      const updated = await tx.signalMatch.update({
        where: { id },
        data: {
          status: 'rejected',
          decidedBy: input.userId,
          decidedAt: new Date(),
        },
        include: {
          vendor: { select: { id: true, name: true } },
          signal: { select: { id: true, title: true } },
        },
      });

      await auditService.log({
        userId: input.userId,
        action: 'REJECT_MATCH',
        entity: 'match',
        entityId: id.toString(),
        details: {
          vendorId: Number(updated.vendor.id),
          signalId: Number(updated.signal.id),
          vendorName: updated.vendor.name,
          signalTitle: updated.signal.title,
          previousStatus: existing.status,
        },
      });

      // Trigger rescore for vendor
      await this.scoringHook([updated.vendor.id]);

      return {
        success: true,
        rescoreTriggered: true,
      };
    });
  },
};