import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { dashboardService } from '../src/modules/dashboard/dashboard.service.js';

const AUTH_COOKIE_NAME = 'vrm_session';

function createTestToken(payload: { id: bigint; email: string }): string {
  return jwt.sign(
    {
      userId: payload.id.toString(),
      sub: payload.id.toString(),
      email: payload.email,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

describe.sequential('Phase 8 Read Endpoints & Dashboard Suite', () => {
  let testUser: any;
  let authToken: string;
  let testVendor: any;
  let testSignal: any;
  let testScore: any;

  beforeEach(async () => {
    dashboardService.clearCache();

    testUser = await prisma.user.upsert({
      where: { email: 'phase8_tester@example.com' },
      update: {},
      create: {
        email: 'phase8_tester@example.com',
        passwordHash: 'dummyhash',
      },
    });

    authToken = createTestToken({ id: testUser.id, email: testUser.email });

    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    testVendor = await prisma.vendor.create({
      data: {
        name: `Phase8 Pharma ${suffix}`,
        normalizedName: `phase8 pharma ${suffix}`,
        country: 'United States',
        category: 'Formulation',
        criticality: 4,
        currentScore: 62.5,
        currentLevel: 'medium',
        scoredAt: new Date(),
      },
    });

    testSignal = await prisma.signal.create({
      data: {
        source: 'openfda_enforcement',
        sourceId: `phase8_sig_${suffix}`,
        signalType: 'recall',
        trust: 'official',
        firmName: testVendor.name,
        severityRaw: 'Class II',
        severityNum: 2,
        title: 'Formulation Defect Recall',
        summary: 'Packaging defect',
        eventDate: new Date('2026-05-15'),
        reportDate: new Date('2026-05-20'),
        raw: {},
      },
    });

    await prisma.signalMatch.create({
      data: {
        vendorId: testVendor.id,
        signalId: testSignal.id,
        status: 'confirmed',
        score: 0.95,
      },
    });

    testScore = await prisma.riskScore.create({
      data: {
        vendorId: testVendor.id,
        score: 62.5,
        level: 'medium',
        configVersion: 1,
        inputs: {
          recalls12m: 1,
          worstClass: 2,
          daysSinceLatest: 45,
          newsSignal: 0,
          criticality: 4,
          regulatoryRisk: 50.0,
        },
        firedRules: [
          {
            stage: 1,
            ruleId: 'S1-R3',
            outputSet: 'Medium',
            strength: 0.5,
            description: 'Few recalls with Moderate severity',
          },
        ],
        computedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    dashboardService.clearCache();
    if (testVendor?.id) {
      const vId = testVendor.id;
      await prisma.alert.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.signalMatch.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.riskScore.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.vendor.delete({ where: { id: vId } }).catch(() => {});
    }
    if (testSignal?.id) {
      await prisma.signal.delete({ where: { id: testSignal.id } }).catch(() => {});
    }
  });

  describe('1. GET /api/v1/dashboard/summary', () => {
    it('returns complete dashboard summary shape including newsEnabled=false', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(typeof res.body.totalVendors).toBe('number');
      expect(typeof res.body.newAlerts).toBe('number');
      expect(typeof res.body.pendingMatches).toBe('number');
      expect(typeof res.body.highOrCriticalVendors).toBe('number');
      expect(typeof res.body.isStale).toBe('boolean');
      expect(res.body.newsEnabled).toBe(false); // E16 requirement

      expect(res.body.distribution).toBeDefined();
      expect(typeof res.body.distribution.low).toBe('number');
      expect(typeof res.body.distribution.medium).toBe('number');
      expect(typeof res.body.distribution.high).toBe('number');
      expect(typeof res.body.distribution.critical).toBe('number');

      expect(Array.isArray(res.body.topRiskyVendors)).toBe(true);
      expect(Array.isArray(res.body.latestAlerts)).toBe(true);
    });

    it('leverages 30-second in-memory cache and bypasses on ?refresh=true', async () => {
      // First call: populates cache
      const res1 = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);
      expect(res1.status).toBe(200);

      // Second call: returns cached data immediately
      const res2 = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);
      expect(res2.status).toBe(200);
      expect(res2.body.totalVendors).toBe(res1.body.totalVendors);

      // Third call with ?refresh=true forces recalculation
      const res3 = await request(app)
        .get('/api/v1/dashboard/summary?refresh=true')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);
      expect(res3.status).toBe(200);
    });

    it('enforces authentication with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/dashboard/summary');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('2. GET /api/v1/vendors/:id/signals', () => {
    it('returns paginated signals matched to the vendor', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${testVendor.id}/signals`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data.length).toBe(1);

      const item = res.body.data[0];
      expect(item.id).toBe(Number(testSignal.id));
      expect(item.title).toBe('Formulation Defect Recall');
      expect(item.severityRaw).toBe('Class II');
      expect(item.matchStatus).toBe('confirmed');
    });

    it('filters signals by trust level and matchStatus', async () => {
      const resFiltered = await request(app)
        .get(`/api/v1/vendors/${testVendor.id}/signals?trust=official&matchStatus=confirmed`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(resFiltered.status).toBe(200);
      expect(resFiltered.body.total).toBe(1);

      const resEmpty = await request(app)
        .get(`/api/v1/vendors/${testVendor.id}/signals?trust=unverified`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(resEmpty.status).toBe(200);
      expect(resEmpty.body.total).toBe(0);
    });

    it('returns 404 NOT_FOUND for non-existent vendor', async () => {
      const res = await request(app)
        .get('/api/v1/vendors/999999999/signals')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('3. GET /api/v1/vendors/:id/score', () => {
    it('returns latest score details, inputs breakdown, and fired rules', async () => {
      const res = await request(app)
        .get(`/api/v1/vendors/${testVendor.id}/score`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.vendorId).toBe(Number(testVendor.id));
      expect(res.body.score).toBe(62.5);
      expect(res.body.level).toBe('medium');
      expect(res.body.inputs.recalls12m).toBe(1);
      expect(res.body.inputs.regulatoryRisk).toBe(50.0);
      expect(Array.isArray(res.body.firedRules)).toBe(true);
      expect(res.body.firedRules[0].ruleId).toBe('S1-R3');
    });

    it('returns 404 NOT_FOUND if vendor has no computed scores', async () => {
      const unScoredVendor = await prisma.vendor.create({
        data: {
          name: `Unscored Vendor ${Date.now()}`,
          normalizedName: `unscored vendor ${Date.now()}`,
        },
      });

      try {
        const res = await request(app)
          .get(`/api/v1/vendors/${unScoredVendor.id}/score`)
          .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      } finally {
        await prisma.vendor.delete({ where: { id: unScoredVendor.id } });
      }
    });
  });

  describe('4. GET /api/v1/vendors/:id/score-history', () => {
    it('returns paginated score history time series', async () => {
      // Add older historical score
      await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 40.0,
          level: 'medium',
          configVersion: 1,
          inputs: {},
          firedRules: [],
          computedAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      const res = await request(app)
        .get(`/api/v1/vendors/${testVendor.id}/score-history?page=1&pageSize=10`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].score).toBe(62.5); // latest first
      expect(res.body.data[1].score).toBe(40.0);
    });
  });

  describe('5. GET /api/v1/audit-log', () => {
    it('returns paginated audit trail filterable by action and entity', async () => {
      await prisma.auditLog.create({
        data: {
          userId: testUser.id,
          action: 'TEST_READ_ACTION',
          entity: 'audit_test_entity',
          entityId: '123',
          details: { sample: 'data' },
        },
      });

      const res = await request(app)
        .get('/api/v1/audit-log?action=TEST_READ_ACTION')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      const entry = res.body.data.find((e: any) => e.action === 'TEST_READ_ACTION');
      expect(entry).toBeDefined();
      expect(entry.entity).toBe('audit_test_entity');
      expect(entry.userEmail).toBe(testUser.email);
    });
  });
});
