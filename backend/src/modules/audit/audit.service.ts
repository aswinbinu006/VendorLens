import { prisma } from '../../config/db.js';
import { logger } from '../../config/logger.js';

export interface AuditLogInput {
  userId?: bigint | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

import type { AuditLogItem } from '../../types/index.js';

export interface ListAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: number;
  from?: string;
  to?: string;
}

export const auditService = {
  async log(input: AuditLogInput): Promise<void> {
    try {
      let validUserId = input.userId ?? null;
      if (validUserId) {
        const userExists = await prisma.user.findUnique({
          where: { id: validUserId },
          select: { id: true },
        });
        if (!userExists) {
          validUserId = null;
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: validUserId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          details: (input.details as any) ?? null,
        },
      });
    } catch (err) {
      // Ingestion / state must not crash on audit failure, but log error
      logger.error({ err, input }, 'Failed to write audit log entry');
    }
  },

  async list(params: ListAuditLogsParams = {}): Promise<{ data: AuditLogItem[]; page: number; pageSize: number; total: number }> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;
    if (params.userId) where.userId = BigInt(params.userId);
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: { select: { email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data: AuditLogItem[] = logs.map((l) => ({
      id: Number(l.id),
      userId: l.userId ? Number(l.userId) : null,
      userEmail: l.user?.email || null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details as Record<string, unknown> | null,
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  },
};
