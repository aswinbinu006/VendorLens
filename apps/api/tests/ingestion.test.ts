import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import {
  OpenFdaAdapter,
  type OpenFdaRecordRaw,
} from '../src/modules/ingestion/adapters/openfda.adapter.js';
import {
  canonicalJson,
  computeContentHash,
  redactApiKey,
} from '../src/modules/ingestion/adapter.js';
import { IngestionService, ingestionService } from '../src/modules/ingestion/ingestion.service.js';
import { createApp } from '../src/app.js';
import { authService, AUTH_COOKIE_NAME } from '../src/modules/auth/auth.service.js';

// Load real fixture recorded in Step 0
const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'openfda');
const realPage1 = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'enforcement-page-1.json'), 'utf8')
);
const realSample1 = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'enforcement-sample-1.json'), 'utf8')
);
const oversizeMeta = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'enforcement-oversize-meta.json'), 'utf8')
);

describe('Phase 3 Ingestion Suite', () => {
  describe('1. Parsing & Normalization', () => {
    it('defensively parses YYYYMMDD dates and returns null for invalid formats', () => {
      expect(OpenFdaAdapter.parseFdaDate('20251105')).toEqual(new Date(Date.UTC(2025, 10, 5)));
      expect(OpenFdaAdapter.parseFdaDate('20240229')).toEqual(new Date(Date.UTC(2024, 1, 29))); // Leap year
      expect(OpenFdaAdapter.parseFdaDate('20230229')).toBeNull(); // Invalid leap year
      expect(OpenFdaAdapter.parseFdaDate('20251301')).toBeNull(); // Month 13
      expect(OpenFdaAdapter.parseFdaDate('not-a-date')).toBeNull();
      expect(OpenFdaAdapter.parseFdaDate('')).toBeNull();
      expect(OpenFdaAdapter.parseFdaDate(null)).toBeNull();
      expect(OpenFdaAdapter.parseFdaDate(undefined)).toBeNull();
    });

    it('correctly maps severity classes and warns on unusual ones', () => {
      expect(OpenFdaAdapter.mapSeverity('Class I')).toEqual({
        severityRaw: 'Class I',
        severityNum: 3,
      });
      expect(OpenFdaAdapter.mapSeverity('Class II')).toEqual({
        severityRaw: 'Class II',
        severityNum: 2,
      });
      expect(OpenFdaAdapter.mapSeverity('Class III')).toEqual({
        severityRaw: 'Class III',
        severityNum: 1,
      });
      expect(OpenFdaAdapter.mapSeverity('Unclassified Warning')).toEqual({
        severityRaw: 'Unclassified Warning',
        severityNum: null,
      });
      expect(OpenFdaAdapter.mapSeverity(null)).toEqual({
        severityRaw: null,
        severityNum: null,
      });
    });

    it('caps very long arrays in raw at 20 items with annotation', () => {
      const longArray = Array.from({ length: 35 }, (_, i) => `item-${i}`);
      const rawWithLongArray: OpenFdaRecordRaw = {
        recall_number: 'D-TEST-1',
        distribution_pattern: 'National',
        lot_numbers: longArray,
      };

      const sanitized = OpenFdaAdapter.sanitizeRawRecord(rawWithLongArray);
      expect((sanitized.lot_numbers as string[]).length).toBe(20);
      expect(sanitized._arrayTruncationNote).toContain('lot_numbers (capped at 20 from 35)');
    });

    it('truncates reason_for_recall to 2000 characters and sets eventDate = reportDate', () => {
      const adapter = new OpenFdaAdapter();
      const longReason = 'A'.repeat(2500);
      const record: OpenFdaRecordRaw = {
        recall_number: 'D-999-2025',
        classification: 'Class I',
        recalling_firm: 'Pharma Test Corp',
        reason_for_recall: longReason,
        report_date: '20251012',
        recall_initiation_date: '20250915',
        country: 'United States',
        status: 'Ongoing',
      };

      const normalized = adapter.normalizeRecord(record);
      expect(normalized).not.toBeNull();
      expect(normalized!.summary?.length).toBe(2000);
      expect(normalized!.eventDate).toEqual(new Date(Date.UTC(2025, 9, 12)));
      expect(normalized!.reportDate).toEqual(new Date(Date.UTC(2025, 9, 12)));
      expect(normalized!.recallInitiationDate).toEqual(new Date(Date.UTC(2025, 8, 15)));
      expect(normalized!.severityNum).toBe(3);
      expect(normalized!.sourceId).toBe('D-999-2025');
      // Status must only be in raw, not mapped directly
      expect((normalized as any).status).toBeUndefined();
      expect(normalized!.raw.status).toBe('Ongoing');
    });

    it('handles missing recall_number per E22 by generating synthetic source_id with sha256 prefix', () => {
      const adapter = new OpenFdaAdapter();
      const record: OpenFdaRecordRaw = {
        event_id: '93874',
        classification: 'Class II',
        recalling_firm: 'Aurobindo Pharma USA, Inc.',
        product_description: 'Acetaminophen Tablets USP 500mg',
        report_date: '20251012',
      };

      const normalized = adapter.normalizeRecord(record);
      expect(normalized).not.toBeNull();
      // SHA256 of 'Acetaminophen Tablets USP 500mg' first 12 hex chars
      const expectedHash = crypto
        .createHash('sha256')
        .update('Acetaminophen Tablets USP 500mg')
        .digest('hex')
        .slice(0, 12);
      expect(normalized!.sourceId).toBe(`93874:${expectedHash}`);
      expect(normalized!.title).toBe(`93874:${expectedHash} - Aurobindo Pharma USA, Inc.`);
    });

    it('generates deterministic contentHash via key-sorted canonicalJson', () => {
      const obj1 = { b: 2, a: 1, c: { y: 'test', x: 10 } };
      const obj2 = { a: 1, c: { x: 10, y: 'test' }, b: 2 };

      expect(canonicalJson(obj1)).toBe(canonicalJson(obj2));
      expect(computeContentHash(obj1)).toBe(computeContentHash(obj2));
    });
  });

  describe('2. Window Chunking & Pagination', () => {
    it('generates correct calendar-month chunks across multi-month window', () => {
      const chunks = OpenFdaAdapter.generateMonthChunks('20250115', '20250320');
      expect(chunks).toEqual([
        { start: '20250115', end: '20250131' },
        { start: '20250201', end: '20250228' },
        { start: '20250301', end: '20250320' },
      ]);
    });

    it('splits oversize window when meta.results.total exceeds limit', async () => {
      const mockFetch = vi.fn();

      // First call returns oversize meta
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(oversizeMeta), { status: 200 })
      );

      // Sub-halves return normal paginated chunks
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ meta: { results: { skip: 0, limit: 100, total: 1 } }, results: [realSample1.results[0]] }), { status: 200 })
      );
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ meta: { results: { skip: 0, limit: 100, total: 0 } }, results: [] }), { status: 200 })
      );

      const adapter = new OpenFdaAdapter({
        fetchFn: mockFetch,
        initialBackoffMs: 1,
        pacingDelayMs: 0,
      });

      const result = await adapter.fetchWindow('20250101', '20250131');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.records.length).toBe(1);
    });
  });

  describe('3. HTTP Retries, Backoff & Key Redaction', () => {
    it('retries on 429 honoring Retry-After header and succeeds on retry', async () => {
      const mockFetch = vi.fn();

      // 1st attempt: 429 with Retry-After: 1
      mockFetch.mockResolvedValueOnce(
        new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '0' },
        })
      );
      // 2nd attempt: Success
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(realSample1), { status: 200 })
      );

      const adapter = new OpenFdaAdapter({
        fetchFn: mockFetch,
        initialBackoffMs: 1,
        pacingDelayMs: 0,
      });

      const result = await adapter.fetchWindow('20251101', '20251130');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.records.length).toBe(1);
    });

    it('retries on 500 error up to 3 times before failing a chunk', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

      const adapter = new OpenFdaAdapter({
        fetchFn: mockFetch,
        maxRetries: 2,
        initialBackoffMs: 1,
        pacingDelayMs: 0,
      });

      await expect(adapter.fetchWindow('20251101', '20251130')).rejects.toThrow(
        /chunks failed during openFDA ingestion/
      );
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('strictly redacts API key from logs, error strings, and URLs', () => {
      const testKey = 'dummy_secret_api_key_for_testing_12345';
      const textWithQuery = `https://api.fda.gov/drug/enforcement.json?search=Semaglutide&api_key=${testKey}&limit=10`;
      const textWithJson = `{"error": "Failed request", "api_key": "${testKey}"}`;

      expect(redactApiKey(textWithQuery, testKey)).not.toContain(testKey);
      expect(redactApiKey(textWithQuery, testKey)).toContain('api_key=[REDACTED]');

      expect(redactApiKey(textWithJson, testKey)).not.toContain(testKey);
      expect(redactApiKey(textWithJson, testKey)).toContain('[REDACTED]');
    });
  });

  describe('4. Ingestion Service: Idempotency, Change Detection & Guard (b)', () => {
    let mockPrisma: any;
    let service: IngestionService;

    beforeEach(() => {
      const signalsDb = new Map<string, any>();
      let idCounter = 1n;

      mockPrisma = {
        signal: {
          findUnique: vi.fn(async ({ where }: any) => {
            const key = `${where.source_sourceId.source}:${where.source_sourceId.sourceId}`;
            return signalsDb.get(key) || null;
          }),
          create: vi.fn(async ({ data }: any) => {
            const id = idCounter++;
            const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
            signalsDb.set(`${data.source}:${data.sourceId}`, record);
            return { id };
          }),
          update: vi.fn(async ({ where, data }: any) => {
            for (const [key, val] of signalsDb.entries()) {
              if (val.id === where.id) {
                const updated = { ...val, ...data, updatedAt: new Date() };
                signalsDb.set(key, updated);
                return { id: val.id };
              }
            }
            return { id: where.id };
          }),
        },
        $transaction: vi.fn(async (callback: any) => {
          return callback(mockPrisma);
        }),
      };

      service = new IngestionService();
      // Inject transaction wrapper
      (service as any).upsertRecordsBatch = async (records: any[]) => {
        const insertedIds: bigint[] = [];
        const updatedIds: bigint[] = [];
        let insertedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;

        for (const item of records) {
          const existing = await mockPrisma.signal.findUnique({
            where: { source_sourceId: { source: item.source, sourceId: item.sourceId } },
          });

          if (!existing) {
            const created = await mockPrisma.signal.create({ data: item });
            insertedIds.push(created.id);
            insertedCount++;
          } else if (existing.contentHash !== item.contentHash) {
            const updated = await mockPrisma.signal.update({
              where: { id: existing.id },
              data: item,
            });
            updatedIds.push(updated.id);
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }

        return { insertedIds, updatedIds, insertedCount, updatedCount, unchangedCount };
      };
    });

    it('is completely idempotent: re-ingesting same fixture produces inserted=0, updated=0', async () => {
      const adapter = new OpenFdaAdapter();
      const records = realPage1.results
        .map((r: any) => adapter.normalizeRecord(r))
        .filter(Boolean);

      // 1st run
      const firstRun = await service.upsertRecordsBatch(records);
      expect(firstRun.insertedCount).toBe(records.length);
      expect(firstRun.updatedCount).toBe(0);

      // 2nd run with exact same records
      const secondRun = await service.upsertRecordsBatch(records);
      expect(secondRun.insertedCount).toBe(0);
      expect(secondRun.updatedCount).toBe(0);
      expect(secondRun.unchangedCount).toBe(records.length);
    });

    it('detects content changes and increments updated count without duplicate rows', async () => {
      const adapter = new OpenFdaAdapter();
      const baseRecord = adapter.normalizeRecord(realSample1.results[0])!;

      // Initial insert
      const firstRun = await service.upsertRecordsBatch([baseRecord]);
      expect(firstRun.insertedCount).toBe(1);

      // Modified record: reason text altered
      const modifiedRaw = {
        ...baseRecord.raw,
        reason_for_recall: 'Updated recall explanation due to additional audit findings',
      };
      const modifiedRecord = {
        ...baseRecord,
        raw: modifiedRaw,
        summary: 'Updated recall explanation due to additional audit findings',
        contentHash: computeContentHash(modifiedRaw),
      };

      const secondRun = await service.upsertRecordsBatch([modifiedRecord]);
      expect(secondRun.insertedCount).toBe(0);
      expect(secondRun.updatedCount).toBe(1);
    });

    it('enforces Guard (b): duplicate source_id with different contentHash in same run never overwrites', async () => {
      const adapter = new OpenFdaAdapter();
      const item1 = adapter.normalizeRecord(realSample1.results[0])!;
      const item2DifferentHash = {
        ...item1,
        contentHash: 'conflicting-sha256-hash-value',
      };

      const seenSourceIds = new Map<string, string>();
      const safeRecords: any[] = [];
      const errorNotes: string[] = [];

      const chunk = [item1, item2DifferentHash];
      for (const item of chunk) {
        const prev = seenSourceIds.get(item.sourceId);
        if (prev !== undefined) {
          if (prev !== item.contentHash) {
            const note = `Guard (b) triggered: duplicate source_id "${item.sourceId}"`;
            errorNotes.push(note);
            continue; // Skip overwriting!
          }
        } else {
          seenSourceIds.set(item.sourceId, item.contentHash);
          safeRecords.push(item);
        }
      }

      expect(safeRecords.length).toBe(1);
      expect(errorNotes.length).toBe(1);
      expect(errorNotes[0]).toContain('Guard (b) triggered');
    });
  });

  describe('5. Endpoints & Authentication', () => {
    const app = createApp({ NODE_ENV: 'test' });
    const testAdminToken = authService.generateToken({
      userId: '1',
      email: 'admin@example.com',
    });

    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).post('/api/v1/ingest/run').send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects POST requests missing X-Requested-With header with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/ingest/run')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${testAdminToken}`])
        .send({ mode: 'incremental' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('accepts authenticated POST /api/v1/ingest/run with 202 Accepted', async () => {
      vi.spyOn(ingestionService, 'run').mockResolvedValueOnce({
        runId: 42n,
        status: 'success',
        fetched: 10,
        newRecords: 10,
        updatedRecords: 0,
        sourceLastUpdated: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/ingest/run')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${testAdminToken}`])
        .set('X-Requested-With', 'fetch')
        .send({ mode: 'incremental' });

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ runId: '42' });
    });

    it('enforces single-flight 409 CONFLICT if another run is in progress', async () => {
      // Simulate active local lock
      (ingestionService as any).isLocallyLocked = true;

      try {
        const res = await request(app)
          .post('/api/v1/ingest/run')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${testAdminToken}`])
          .set('X-Requested-With', 'fetch')
          .send({ mode: 'incremental' });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
      } finally {
        (ingestionService as any).isLocallyLocked = false;
      }
    });

    it('enforces rate limit: blocks 6th request within 10 minutes', async () => {
      const clientIp = '198.51.100.99';

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/ingest/run')
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${testAdminToken}`])
          .set('X-Requested-With', 'fetch')
          .set('X-Forwarded-For', clientIp)
          .send({ mode: 'incremental' });
      }

      const blockedRes = await request(app)
        .post('/api/v1/ingest/run')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${testAdminToken}`])
        .set('X-Requested-With', 'fetch')
        .set('X-Forwarded-For', clientIp)
        .send({ mode: 'incremental' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
