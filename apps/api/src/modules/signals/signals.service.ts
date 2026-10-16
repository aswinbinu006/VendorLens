import type { SignalItem } from '@vrm/types';

const mockSignals: SignalItem[] = [
  {
    id: 1,
    type: 'recall',
    trust: 'official',
    title: 'Recall signal',
    summary: 'Summary of recall signal',
    severityRaw: '5.2',
    severityNum: 5,
    eventDate: '2024-09-01',
    url: 'https://example.com/signal1',
    sourceDomain: 'example.com',
    matchStatus: 'auto',
    firmName: 'Acme Corp',
  },
  {
    id: 2,
    type: 'news',
    trust: 'unverified',
    title: 'News signal',
    summary: 'Summary of news signal',
    severityRaw: '3.1',
    severityNum: 3,
    eventDate: '2024-09-02',
    url: 'https://example.com/signal2',
    sourceDomain: 'example.com',
    matchStatus: 'pending',
    firmName: null,
  },
];

export function getAllSignals(
  filters?: Partial<Record<string, any>>,
  page = 1,
  pageSize = 10
): SignalItem[] {
  let results = [...mockSignals];

  if (filters?.type) {
    results = results.filter((s) => s.type === filters.type);
  }

  if (filters?.eventDate) {
    results = results.filter(
      (s) => s.eventDate === filters.eventDate
    );
  }

  const start = (page - 1) * pageSize;
  return results.slice(start, start + pageSize);
}

export function getSignalById(id: number): SignalItem | null {
  return mockSignals.find((s) => s.id === id) || null;
}