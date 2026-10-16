import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { normalizeName } from '../src/modules/vendors/normalize.js';
import {
  trigramSimilarity,
  getFirstSignificantToken,
  matchSignalToVendors,
  type MatchableSignal,
  type MatchableVendor,
} from '../src/modules/matches/matcher.js';
import { matchService } from '../src/modules/matches/match.service.js';
import { vendorService } from '../src/modules/vendors/vendor.service.js';

describe('Phase 4: Matching Engine & Endpoints Suite', () => {
  let testUser: { id: bigint; email: string };
  let authCookie: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.signalMatch.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.riskScore.deleteMany({});
    await prisma.vendorAlias.deleteMany({});
    await prisma.vendor.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.signal.deleteMany({
      where: { sourceId: { startsWith: 'TEST-RECALL-' } },
    });

    // Create a verified test user
    testUser = await prisma.user.create({
      data: {
        email: 'test_phase4@example.com',
        passwordHash: 'dummy_hash',
      },
    });

    // Obtain auth cookie using test login or direct JWT
    const { authService } = await import('../src/modules/auth/auth.service.js');
    const token = authService.generateToken({
      userId: testUser.id.toString(),
      email: testUser.email,
    });
    authCookie = `vrm_session=${token}; Path=/; HttpOnly`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Pure Matcher Unit Tests', () => {
    it('E19: treats apostrophes by deletion ("Dr. Reddy\'s" and "Dr Reddys" normalize equal)', () => {
      const withApostrophe = normalizeName("Dr. Reddy's Laboratories Ltd.");
      const withoutApostrophe = normalizeName('Dr Reddys Laboratories Ltd');
      expect(withApostrophe).toBe('dr reddys laboratories');
      expect(withoutApostrophe).toBe('dr reddys laboratories');
      expect(withApostrophe).toBe(withoutApostrophe);
    });

    it('matches exact normalized vendor name with status=auto and score=1.0', () => {
      const signal: MatchableSignal = {
        id: 101n,
        firmName: 'Pfizer Inc.',
        country: 'United States',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 1n,
          name: 'Pfizer',
          normalizedName: 'pfizer',
          country: 'United States',
          aliases: [],
        },
      ];

      const matches = matchSignalToVendors(signal, vendors);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.status).toBe('auto');
      expect(matches[0]?.score).toBe(1.0);
      expect(matches[0]?.vendorId).toBe(1n);
    });

    it('matches exact normalized alias with status=auto and score=1.0', () => {
      const signal: MatchableSignal = {
        id: 102n,
        firmName: 'Sun Pharma USA',
        country: 'United States',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 2n,
          name: 'Sun Pharmaceutical Industries Ltd.',
          normalizedName: 'sun pharmaceutical industries',
          country: 'India',
          aliases: [
            {
              id: 201n,
              alias: 'Sun Pharma USA',
              normalizedAlias: 'sun pharma usa',
            },
          ],
        },
      ];

      const matches = matchSignalToVendors(signal, vendors);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.status).toBe('auto');
      expect(matches[0]?.score).toBe(1.0);
      expect(matches[0]?.matchedName).toBe('Sun Pharma USA');
    });

    it('flags near-variant with status=pending when similarity >= 0.60 and same first token', () => {
      const signal: MatchableSignal = {
        id: 103n,
        firmName: 'Aurobindo Pharma USA Inc',
        country: 'United States',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 3n,
          name: 'Aurobindo Pharma Ltd',
          normalizedName: 'aurobindo pharma',
          country: 'India',
          aliases: [],
        },
      ];

      const matches = matchSignalToVendors(signal, vendors, 0.60);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.status).toBe('pending');
      expect(matches[0]?.score).toBeGreaterThanOrEqual(0.60);
      expect(matches[0]?.score).toBeLessThan(1.0);
    });

    it('discards unrelated generic-word names ("X Pharmaceuticals" vs "Y Pharmaceuticals")', () => {
      const signal: MatchableSignal = {
        id: 104n,
        firmName: 'X Pharmaceuticals Inc',
        country: 'United States',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 4n,
          name: 'Y Pharmaceuticals Corp',
          normalizedName: 'y pharmaceuticals',
          country: 'United States',
          aliases: [],
        },
      ];

      const matches = matchSignalToVendors(signal, vendors, 0.60);
      expect(matches).toHaveLength(0); // Discarded due to different first significant token
    });

    it('allows candidates with similarity >= 0.85 even if first token differs slightly (typo tolerance)', () => {
      // Synthetic test string with >= 0.85 similarity
      const signal: MatchableSignal = {
        id: 105n,
        firmName: 'Pharmaceutikals Global Manufacturing Inc',
        country: 'United States',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 5n,
          name: 'Pharmaceuticals Global Manufacturing Inc',
          normalizedName: 'pharmaceuticals global manufacturing',
          country: 'United States',
          aliases: [],
        },
      ];

      const sim = trigramSimilarity('pharmaceutikals global manufacturing', 'pharmaceuticals global manufacturing');
      expect(sim).toBeGreaterThanOrEqual(0.85);

      const matches = matchSignalToVendors(signal, vendors, 0.60);
      expect(matches).toHaveLength(1);
      expect(matches[0]?.status).toBe('pending');
      expect(matches[0]?.score).toBeGreaterThanOrEqual(0.85);
    });

    it('creates multiple candidate rows if several vendors match one signal, tie-breaking by country (E18)', () => {
      const signal: MatchableSignal = {
        id: 106n,
        firmName: 'Cipla Therapeutics',
        country: 'India',
      };
      const vendors: MatchableVendor[] = [
        {
          id: 10n,
          name: 'Cipla Therapeutics US',
          normalizedName: 'cipla therapeutics us',
          country: 'United States',
          aliases: [],
        },
        {
          id: 11n,
          name: 'Cipla Therapeutics India',
          normalizedName: 'cipla therapeutics india',
          country: 'India',
          aliases: [],
        },
      ];

      const matches = matchSignalToVendors(signal, vendors, 0.60);
      expect(matches.length).toBeGreaterThanOrEqual(2);
      // Both match "Cipla Therapeutics"; vendor with country 'India' should tie-break higher if score is equal or country matches
      const indiaMatch = matches.find((m) => m.vendorId === 11n);
      expect(indiaMatch?.countryMatch).toBe(true);
    });
  });

  describe('2. Database & Vendor Backfill Integration', () => {
    it('vendor create backfills matching against stored signals in DB', async () => {
      // 1. Insert a test signal directly in the database
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-901',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Sun Pharmaceutical Industries Inc',
          eventId: '99001',
          severityRaw: 'Class II',
          severityNum: 2,
          raw: { event_id: '99001' },
          reportDate: new Date('2026-05-01'),
        },
      });

      // 2. Create a vendor matching this firm
      const vendor = await vendorService.createVendor(testUser.id, {
        name: 'Sun Pharmaceutical Industries Ltd',
        country: 'United States',
        criticality: 4,
        aliases: ['Sun Pharma'],
      });

      // 3. Verify match was created by backfill
      const matches = await prisma.signalMatch.findMany({
        where: { vendorId: BigInt(vendor.id) },
      });

      expect(matches.length).toBeGreaterThanOrEqual(1);
      const testMatch = matches.find((m) => m.signalId === signal.id);
      expect(testMatch).toBeDefined();
      expect(testMatch?.status).toBe('auto'); // Exact normalized name
    });

    it('E17: preserves human decisions upon rematching (ON CONFLICT DO NOTHING)', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-902',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Aurobindo Pharma USA Inc',
          eventId: '99002',
          raw: { event_id: '99002' },
          reportDate: new Date('2026-06-01'),
        },
      });

      const vendor = await vendorService.createVendor(testUser.id, {
        name: 'Aurobindo Pharma Ltd',
        country: 'India',
      });

      // Find the generated pending match
      const initialMatch = await prisma.signalMatch.findUnique({
        where: {
          signalId_vendorId: {
            signalId: signal.id,
            vendorId: BigInt(vendor.id),
          },
        },
      });
      expect(initialMatch).toBeDefined();

      // Reject the match (Human decision)
      await matchService.rejectMatch(initialMatch!.id, { userId: testUser.id });

      const rejectedMatch = await prisma.signalMatch.findUnique({
        where: { id: initialMatch!.id },
      });
      expect(rejectedMatch?.status).toBe('rejected');
      expect(rejectedMatch?.decidedBy).toBe(testUser.id);

      // Re-trigger matching on this signal (simulate re-ingestion)
      await matchService.onSignalsChanged([signal.id], []);

      // Verify the match remains REJECTED and was not recreated/overwritten
      const matchAfterRematch = await prisma.signalMatch.findUnique({
        where: { id: initialMatch!.id },
      });
      expect(matchAfterRematch?.status).toBe('rejected');
      expect(matchAfterRematch?.decidedBy).toBe(testUser.id);
    });

    it('reject works as a human override on auto and confirmed matches', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-903',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Pfizer Inc',
          eventId: '99003',
          raw: { event_id: '99003' },
          reportDate: new Date('2026-07-01'),
        },
      });

      const vendor = await vendorService.createVendor(testUser.id, {
        name: 'Pfizer Inc',
        country: 'United States',
      });

      // It was matched as 'auto'
      const autoMatch = await prisma.signalMatch.findFirst({
        where: { signalId: signal.id, vendorId: BigInt(vendor.id) },
      });
      expect(autoMatch?.status).toBe('auto');

      // Human overrides auto match by rejecting it
      const result = await matchService.rejectMatch(autoMatch!.id, { userId: testUser.id });
      expect(result.success).toBe(true);

      const updated = await prisma.signalMatch.findUnique({
        where: { id: autoMatch!.id },
      });
      expect(updated?.status).toBe('rejected');
      expect(updated?.decidedBy).toBe(testUser.id);
      expect(updated?.decidedAt).toBeInstanceOf(Date);
    });
  });

  describe('3. Endpoints & Security Checks', () => {
    it('GET /api/v1/matches/pending returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/matches/pending');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/matches/pending returns paginated pending matches with signal details', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-904',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Glenmark Generics Inc USA',
          title: 'D-999-2026 - Glenmark Generics Inc USA',
          summary: 'Defective packaging',
          severityRaw: 'Class II',
          severityNum: 2,
          country: 'United States',
          reportDate: new Date('2026-08-01'),
          raw: { event_id: '99004' },
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          userId: testUser.id,
          name: 'Glenmark Pharmaceuticals',
          normalizedName: 'glenmark pharmaceuticals',
          country: 'United States',
        } as Prisma.VendorUncheckedCreateInput,
      });

      await prisma.signalMatch.create({
        data: {
          signalId: signal.id,
          vendorId: vendor.id,
          status: 'pending',
          score: 0.72,
        },
      });

      const res = await request(app)
        .get('/api/v1/matches/pending')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({
        vendorName: 'Glenmark Pharmaceuticals',
        firmName: 'Glenmark Generics Inc USA',
        country: 'United States',
        classification: 'Class II',
        similarityScore: 0.72,
        status: 'pending',
      });
    });

    it('POST /api/v1/matches/:id/confirm sets confirmed status and writes audit log', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-905',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Cipla USA Inc',
          raw: {},
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: 'Cipla Limited',
          normalizedName: 'cipla',
        },
      });

      const match = await prisma.signalMatch.create({
        data: {
          signalId: signal.id,
          vendorId: vendor.id,
          status: 'pending',
          score: 0.75,
        },
      });

      const res = await request(app)
        .post(`/api/v1/matches/${match.id}/confirm`)
        .set('Cookie', authCookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbMatch = await prisma.signalMatch.findUnique({
        where: { id: match.id },
      });
      expect(dbMatch?.status).toBe('confirmed');
      expect(dbMatch?.decidedBy).toBe(testUser.id);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'CONFIRM_MATCH',
          entityId: match.id.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(testUser.id);
    });

    it('POST /api/v1/matches/:id/reject rejects and writes audit log', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-906',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Unrelated Pharma Corp',
          raw: {},
        },
      });

      const vendor = await prisma.vendor.create({
        data: {
          name: `Test Reject Vendor ${Date.now()}`,
          normalizedName: `test reject vendor ${Date.now()}`,
        },
      });

      try {
        const match = await prisma.signalMatch.create({
          data: {
            signalId: signal.id,
            vendorId: vendor.id,
            status: 'pending',
            score: 0.62,
          },
        });

        const res = await request(app)
          .post(`/api/v1/matches/${match.id}/reject`)
          .set('Cookie', authCookie)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const dbMatch = await prisma.signalMatch.findUnique({
          where: { id: match.id },
        });
        expect(dbMatch?.status).toBe('rejected');
        expect(dbMatch?.decidedBy).toBe(testUser.id);

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: {
            action: 'REJECT_MATCH',
            entityId: match.id.toString(),
          },
        });
        expect(audit).toBeDefined();
        expect(audit?.userId).toBe(testUser.id);
      } finally {
        await prisma.vendor.delete({ where: { id: vendor.id } }).catch(() => {});
        await prisma.signal.delete({ where: { id: signal.id } }).catch(() => {});
      }
    });
  });
});
