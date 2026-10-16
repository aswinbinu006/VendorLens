import { prisma } from '../../config/db.js';
import type { SignalItem } from '../../types/index.js';

export interface SignalFilters {
  type?: 'recall' | 'news';
  eventDate?: string;
}

export async function getAllSignals(
  filters?: SignalFilters,
  page = 1,
  pageSize = 10
): Promise<{ data: SignalItem[]; total: number; page: number; pageSize: number }> {
  const skip = (page - 1) * pageSize;
  const where: any = {};

  if (filters?.type) {
    where.signalType = filters.type;
  }

  if (filters?.eventDate) {
    const d = new Date(filters.eventDate);
    if (!isNaN(d.getTime())) {
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.eventDate = {
        gte: d,
        lt: nextDay,
      };
    }
  }

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.signal.count({ where }),
  ]);

  const items: SignalItem[] = signals.map((s) => ({
    id: Number(s.id),
    type: s.signalType as 'recall' | 'news',
    trust: s.trust as 'official' | 'unverified',
    title: s.title || `${s.signalType.toUpperCase()} - ${s.sourceId}`,
    summary: s.summary || '',
    severityRaw: s.severityRaw || null,
    severityNum: s.severityNum || null,
    eventDate: s.eventDate ? s.eventDate.toISOString().slice(0, 10) : null,
    url: s.url || null,
    sourceDomain: s.sourceDomain || null,
    firmName: s.firmName || null,
    matchStatus: 'pending',
  }));

  return {
    data: items,
    total,
    page,
    pageSize,
  };
}

export async function getSignalById(id: number): Promise<SignalItem | null> {
  const s = await prisma.signal.findUnique({
    where: { id: BigInt(id) },
  });

  if (!s) return null;

  return {
    id: Number(s.id),
    type: s.signalType as 'recall' | 'news',
    trust: s.trust as 'official' | 'unverified',
    title: s.title || `${s.signalType.toUpperCase()} - ${s.sourceId}`,
    summary: s.summary || '',
    severityRaw: s.severityRaw || null,
    severityNum: s.severityNum || null,
    eventDate: s.eventDate ? s.eventDate.toISOString().slice(0, 10) : null,
    url: s.url || null,
    sourceDomain: s.sourceDomain || null,
    firmName: s.firmName || null,
    matchStatus: 'pending',
  };
}