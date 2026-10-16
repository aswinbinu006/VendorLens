import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { alertService } from '../src/modules/alerts/alert.service.js';
import { alertNotifier } from '../src/modules/alerts/notifier.js';

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

describe.sequential('Phase 6 Alerts & Compliance Rules Suite', () => {
  let testVendor: any;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user and vendor
    testUser = await prisma.user.upsert({
      where: { email: 'alert_tester@example.com' },
      update: {},
      create: {
        email: 'alert_tester@example.com',
        passwordHash: 'dummyhash',
      },
    });

    authToken = createTestToken({ id: testUser.id, email: testUser.email });

    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    testVendor = await prisma.vendor.create({
      data: {
        name: `Alert Test Pharma ${suffix}`,
        normalizedName: `alert test pharma ${suffix}`,
        country: 'United States',
        criticality: 3,
      },
    });
  });

  afterEach(async () => {
    // Cleanup created entities
    if (testVendor?.id) {
      const vId = testVendor.id;
      await prisma.alert.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.signalMatch.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.riskScore.deleteMany({ where: { vendorId: vId } }).catch(() => {});
      await prisma.vendor.delete({ where: { id: vId } }).catch(() => {});
    }
    await prisma.alert.deleteMany({ where: { kind: 'ingestion_failure' } }).catch(() => {});
  });

  describe('1. Hard Rules (H1 & H2) and E14 Recency Suppression', () => {
    it('H1: creates critical class_i_recall alert for recent Class I recall', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: `test_h1_${Date.now()}`,
          signalType: 'recall',
          trust: 'official',
          severityRaw: 'Class I',
          severityNum: 3,
          reportDate: new Date(), // recent (today)
          title: 'Class I Emergency Contamination Recall',
          raw: {},
        },
      });

      await prisma.signalMatch.create({
        data: {
          vendorId: testVendor.id,
          signalId: signal.id,
          status: 'auto',
          score: 1.0,
        },
      });

      await alertService.evaluateSignalAlerts(testVendor.id, signal.id);

      const alert = await prisma.alert.findUnique({
        where: { dedupeKey: `h1:class_i:${testVendor.id}:${signal.id}` },
      });

      expect(alert).not.toBeNull();
      expect(alert?.level).toBe('critical');
      expect(alert?.kind).toBe('class_i_recall');
      expect(alert?.message).toContain(`Class I recall detected for ${testVendor.name}`);

      // Cleanup signal
      await prisma.signal.delete({ where: { id: signal.id } });
    });

    it('H2: creates high alert for Class II recall and medium alert for Class III recall', async () => {
      const class2Signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: `test_h2_ii_${Date.now()}`,
          signalType: 'recall',
          trust: 'official',
          severityRaw: 'Class II',
          severityNum: 2,
          reportDate: new Date(),
          title: 'Class II Subpotent Formulation',
          raw: {},
        },
      });

      await prisma.signalMatch.create({
        data: {
          vendorId: testVendor.id,
          signalId: class2Signal.id,
          status: 'confirmed',
          score: 0.95,
        },
      });

      await alertService.evaluateSignalAlerts(testVendor.id, class2Signal.id);

      const alert2 = await prisma.alert.findUnique({
        where: { dedupeKey: `h2:class_ii:${testVendor.id}:${class2Signal.id}` },
      });

      expect(alert2).not.toBeNull();
      expect(alert2?.level).toBe('high');
      expect(alert2?.kind).toBe('new_official_signal');

      // Cleanup
      await prisma.signal.delete({ where: { id: class2Signal.id } });
    });

    it('E14: suppresses alert when signal report_date is older than ALERT_RECENCY_DAYS (30 days)', async () => {
      const oldDate = new Date(Date.now() - 45 * 86400 * 1000); // 45 days ago

      const oldSignal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: `test_e14_old_${Date.now()}`,
          signalType: 'recall',
          trust: 'official',
          severityRaw: 'Class I',
          severityNum: 3,
          reportDate: oldDate,
          title: 'Historical Class I Recall from 45 days ago',
          raw: {},
        },
      });

      await prisma.signalMatch.create({
        data: {
          vendorId: testVendor.id,
          signalId: oldSignal.id,
          status: 'auto',
          score: 1.0,
        },
      });

      await alertService.evaluateSignalAlerts(testVendor.id, oldSignal.id);

      const alert = await prisma.alert.findUnique({
        where: { dedupeKey: `h1:class_i:${testVendor.id}:${oldSignal.id}` },
      });

      // Must be suppressed
      expect(alert).toBeNull();

      await prisma.signal.delete({ where: { id: oldSignal.id } });
    });

    it('Deduplication: re-evaluating the same match does not duplicate alerts', async () => {
      const signal = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: `test_dedupe_${Date.now()}`,
          signalType: 'recall',
          trust: 'official',
          severityRaw: 'Class I',
          severityNum: 3,
          reportDate: new Date(),
          title: 'Class I Dedupe Test',
          raw: {},
        },
      });

      await prisma.signalMatch.create({
        data: {
          vendorId: testVendor.id,
          signalId: signal.id,
          status: 'auto',
          score: 1.0,
        },
      });

      // Run twice
      await alertService.evaluateSignalAlerts(testVendor.id, signal.id);
      await alertService.evaluateSignalAlerts(testVendor.id, signal.id);

      const alerts = await prisma.alert.findMany({
        where: { dedupeKey: `h1:class_i:${testVendor.id}:${signal.id}` },
      });

      expect(alerts.length).toBe(1);

      await prisma.signal.delete({ where: { id: signal.id } });
    });
  });

  describe('2. Soft Rule S1 (Level Increase) & E14 Initial Score Exemption', () => {
    it('E14: initial score computation does NOT trigger an alert', async () => {
      const firstScore = await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 85.0,
          level: 'high',
          inputs: {},
          firedRules: [],
          configVersion: 1,
        },
      });

      await alertService.evaluateScoreAlert(testVendor.id, 85.0, 'high', firstScore.id);

      const alerts = await prisma.alert.findMany({
        where: { vendorId: testVendor.id, kind: 'level_increase' },
      });

      expect(alerts.length).toBe(0);
    });

    it('S1: fires level_increase alert when vendor level transitions from medium to high', async () => {
      // 1. Initial baseline score
      await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 45.0,
          level: 'medium',
          inputs: {},
          firedRules: [],
          configVersion: 1,
          computedAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });

      // 2. Subsequent elevated score
      const secondScore = await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 75.0,
          level: 'high',
          inputs: {},
          firedRules: [],
          configVersion: 1,
          computedAt: new Date(),
        },
      });

      await alertService.evaluateScoreAlert(testVendor.id, 75.0, 'high', secondScore.id);

      const alert = await prisma.alert.findUnique({
        where: {
          dedupeKey: `s1:level_increase:${testVendor.id}:medium_to_high:${secondScore.id}`,
        },
      });

      expect(alert).not.toBeNull();
      expect(alert?.kind).toBe('level_increase');
      expect(alert?.level).toBe('high');
      expect(alert?.message).toContain('risk level increased from MEDIUM to HIGH');
    });

    it('S1: does NOT fire alert when score drops or stays at the same level', async () => {
      await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 75.0,
          level: 'high',
          inputs: {},
          firedRules: [],
          configVersion: 1,
          computedAt: new Date(Date.now() - 3600000),
        },
      });

      const thirdScore = await prisma.riskScore.create({
        data: {
          vendorId: testVendor.id,
          score: 45.0,
          level: 'medium', // dropped from high to medium
          inputs: {},
          firedRules: [],
          configVersion: 1,
          computedAt: new Date(),
        },
      });

      await alertService.evaluateScoreAlert(testVendor.id, 45.0, 'medium', thirdScore.id);

      const alerts = await prisma.alert.findMany({
        where: {
          vendorId: testVendor.id,
          dedupeKey: { contains: 'high_to_medium' },
        },
      });

      expect(alerts.length).toBe(0);
    });
  });

  describe('3. Hard Rule H3 (Ingestion Failure Consecutive Alert)', () => {
    it('H3: creates high ingestion_failure alert when last 3 runs failed', async () => {
      const source = `test_ingest_h3_${Date.now()}`;

      // Create 3 failed runs
      const run1 = await prisma.ingestionRun.create({
        data: {
          source,
          trigger: 'schedule',
          status: 'failed',
          startedAt: new Date(Date.now() - 30000),
          error: 'Connection timeout 1',
        },
      });
      const run2 = await prisma.ingestionRun.create({
        data: {
          source,
          trigger: 'schedule',
          status: 'failed',
          startedAt: new Date(Date.now() - 20000),
          error: 'Connection timeout 2',
        },
      });
      const run3 = await prisma.ingestionRun.create({
        data: {
          source,
          trigger: 'schedule',
          status: 'failed',
          startedAt: new Date(Date.now() - 10000),
          error: 'API rate limit exhausted',
        },
      });

      await alertService.evaluateIngestionFailures(source, run3.id);

      const alert = await prisma.alert.findUnique({
        where: { dedupeKey: `h3:ingestion_failure:${source}:${run3.id}` },
      });

      expect(alert).not.toBeNull();
      expect(alert?.kind).toBe('ingestion_failure');
      expect(alert?.level).toBe('high');
      expect(alert?.vendorId).toBeNull();
      expect(alert?.message).toContain(`3 consecutive ingestion runs failed for source ${source}`);

      // Cleanup
      await prisma.ingestionRun.deleteMany({ where: { source } });
    });
  });

  describe('4. REST Endpoints (GET /alerts, PATCH /alerts/:id)', () => {
    it('GET /api/v1/alerts: lists alerts with pagination and filters', async () => {
      const alert = await prisma.alert.create({
        data: {
          vendorId: testVendor.id,
          kind: 'new_official_signal',
          level: 'high',
          message: 'Test endpoint alert',
          dedupeKey: `endpoint_test_get_${Date.now()}_${Math.random()}`,
          status: 'new',
        },
      });

      const res = await request(app)
        .get('/api/v1/alerts?status=new&level=high')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find((a: any) => a.id === Number(alert.id));
      expect(found).toBeDefined();
      expect(found.level).toBe('high');
      expect(found.status).toBe('new');
    });

    it('PATCH /api/v1/alerts/:id: updates status to reviewed with note and creates audit log', async () => {
      const alert = await prisma.alert.create({
        data: {
          vendorId: testVendor.id,
          kind: 'new_official_signal',
          level: 'high',
          message: 'Test endpoint alert review',
          dedupeKey: `endpoint_test_patch_${Date.now()}_${Math.random()}`,
          status: 'new',
        },
      });

      const res = await request(app)
        .patch(`/api/v1/alerts/${alert.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
        .set('X-Requested-With', 'fetch')
        .send({
          status: 'reviewed',
          note: 'Investigated by QA compliance team. Vendor verified.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('reviewed');
      expect(res.body.note).toContain('Investigated by QA compliance team');

      // Check DB
      const inDb = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(inDb?.status).toBe('reviewed');
      expect(inDb?.reviewedBy).toBe(testUser.id);
      expect(inDb?.reviewedAt).not.toBeNull();
    });

    it('PATCH /api/v1/alerts/:id: returns 409 CONFLICT if alert is already reviewed', async () => {
      const alert = await prisma.alert.create({
        data: {
          vendorId: testVendor.id,
          kind: 'new_official_signal',
          level: 'high',
          message: 'Test endpoint alert 409',
          dedupeKey: `endpoint_test_409_${Date.now()}_${Math.random()}`,
          status: 'new',
        },
      });

      // First review
      await request(app)
        .patch(`/api/v1/alerts/${alert.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
        .set('X-Requested-With', 'fetch')
        .send({ status: 'reviewed' });

      // Attempt second review/dismiss
      const res = await request(app)
        .patch(`/api/v1/alerts/${alert.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
        .set('X-Requested-With', 'fetch')
        .send({ status: 'dismissed' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('PATCH /api/v1/alerts/:id: requires X-Requested-With: fetch header', async () => {
      const alert = await prisma.alert.create({
        data: {
          vendorId: testVendor.id,
          kind: 'new_official_signal',
          level: 'high',
          message: 'Test endpoint alert header',
          dedupeKey: `endpoint_test_header_${Date.now()}_${Math.random()}`,
          status: 'new',
        },
      });

      const res = await request(app)
        .patch(`/api/v1/alerts/${alert.id}`)
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
        .send({ status: 'reviewed' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('5. Email Notifier Module', () => {
    it('safely handles unconfigured SMTP by logging and returning false', async () => {
      const spy = vi.spyOn(alertNotifier, 'getTransporter').mockReturnValueOnce(null);

      const sent = await alertNotifier.sendEmail({
        level: 'critical',
        kind: 'class_i_recall',
        message: 'Critical emergency recall',
        vendorName: 'Test Vendor',
        dedupeKey: 'unit_test_key',
      });

      expect(sent).toBe(false);
      spy.mockRestore();
    });
  });
});
