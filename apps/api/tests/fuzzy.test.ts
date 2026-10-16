import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/config/db.js';
import { trapezoid, triangle } from '../src/fuzzy/membership.js';
import { score, defuzzifyCentroid, getCrispLevel } from '../src/fuzzy/engine.js';
import type { FuzzyConfig, FuzzyInputs } from '../src/fuzzy/types.js';
import { DEFAULT_FUZZY_CONFIG } from '../src/modules/fuzzy-config/fuzzy-config.service.js';
import { scoringService } from '../src/modules/scoring/scoring.service.js';

describe('Phase 5: Fuzzy Engine & Scoring Suite', () => {
  const config = DEFAULT_FUZZY_CONFIG as unknown as FuzzyConfig;

  describe('1. Membership Function Boundaries & Midpoints', () => {
    it('evaluates trapezoid boundaries and slope midpoints correctly', () => {
      // Recalls Few: trap(0, 0, 1, 3) (left shoulder)
      // a=0, b=0, c=1, d=3
      // At x <= 0: 1.0 (degenerate left shoulder)
      expect(trapezoid(0, 0, 0, 1, 3)).toBe(1.0);
      expect(trapezoid(-1, 0, 0, 1, 3)).toBe(1.0);
      // Plateau: x in [0, 1] -> 1.0
      expect(trapezoid(0.5, 0, 0, 1, 3)).toBe(1.0);
      expect(trapezoid(1, 0, 0, 1, 3)).toBe(1.0);
      // Falling slope midpoint: x = (1 + 3) / 2 = 2.0 -> (3 - 2) / (3 - 1) = 0.5
      expect(trapezoid(2, 0, 0, 1, 3)).toBe(0.5);
      // Foot: x = 3 -> (3 - 3) / 2 = 0.0
      expect(trapezoid(3, 0, 0, 1, 3)).toBe(0.0);
      // Past foot: x = 4 -> 0.0
      expect(trapezoid(4, 0, 0, 1, 3)).toBe(0.0);

      // Recalls Many: trap(4, 7, 10, 10) (right shoulder)
      // a=4, b=7, c=10, d=10
      // Before foot: x = 3 -> 0.0
      expect(trapezoid(3, 4, 7, 10, 10)).toBe(0.0);
      // Foot: x = 4 -> 0.0
      expect(trapezoid(4, 4, 7, 10, 10)).toBe(0.0);
      // Rising slope midpoint: x = (4 + 7) / 2 = 5.5 -> (5.5 - 4) / (7 - 4) = 1.5 / 3 = 0.5
      expect(trapezoid(5.5, 4, 7, 10, 10)).toBe(0.5);
      // Shoulder: x = 7 -> 1.0
      expect(trapezoid(7, 4, 7, 10, 10)).toBe(1.0);
      // Plateau / Right shoulder: x = 10 -> 1.0, x = 12 -> 1.0
      expect(trapezoid(10, 4, 7, 10, 10)).toBe(1.0);
      expect(trapezoid(12, 4, 7, 10, 10)).toBe(1.0);
    });

    it('evaluates triangle boundaries and slope midpoints correctly', () => {
      // Recalls Some: tri(1, 3, 6)
      // a=1, b=3, c=6
      // Outside: x <= 1 or x >= 6 -> 0.0
      expect(triangle(1, 1, 3, 6)).toBe(0.0);
      expect(triangle(0.5, 1, 3, 6)).toBe(0.0);
      expect(triangle(6, 1, 3, 6)).toBe(0.0);
      expect(triangle(7, 1, 3, 6)).toBe(0.0);
      // Rising slope midpoint: x = (1 + 3) / 2 = 2.0 -> (2 - 1) / (3 - 1) = 0.5
      expect(triangle(2, 1, 3, 6)).toBe(0.5);
      // Peak: x = 3 -> 1.0
      expect(triangle(3, 1, 3, 6)).toBe(1.0);
      // Falling slope midpoint: x = (3 + 6) / 2 = 4.5 -> (6 - 4.5) / (6 - 3) = 1.5 / 3 = 0.5
      expect(triangle(4.5, 1, 3, 6)).toBe(0.5);
    });

    it('handles degenerate shoulder where a=b or c=d correctly', () => {
      // Regulatory risk Low: trap(0, 0, 20, 40)
      expect(trapezoid(0, 0, 0, 20, 40)).toBe(1.0);
      expect(trapezoid(10, 0, 0, 20, 40)).toBe(1.0);
      expect(trapezoid(30, 0, 0, 20, 40)).toBe(0.5); // (40 - 30) / 20 = 0.5
      expect(trapezoid(40, 0, 0, 20, 40)).toBe(0.0);

      // Regulatory risk High: trap(60, 80, 100, 100)
      expect(trapezoid(60, 60, 80, 100, 100)).toBe(0.0);
      expect(trapezoid(70, 60, 80, 100, 100)).toBe(0.5); // (70 - 60) / 20 = 0.5
      expect(trapezoid(80, 60, 80, 100, 100)).toBe(1.0);
      expect(trapezoid(100, 60, 80, 100, 100)).toBe(1.0);
      expect(trapezoid(105, 60, 80, 100, 100)).toBe(1.0);
    });
  });

  describe('2. Hand-Computed Worked Example', () => {
    /**
     * Hand Calculation Derivation:
     *
     * Inputs:
     * - recalls_12m = 2
     * - worst_class = 2 (Class II)
     * - days_since_latest = 120
     * - news_signal = 0.0
     * - criticality = 3
     *
     * Stage 1 Fuzzification:
     * 1. recalls_12m = 2:
     *    - Few trap(0, 0, 1, 3): (3 - 2) / (3 - 1) = 0.5
     *    - Some tri(1, 3, 6): (2 - 1) / (3 - 1) = 0.5
     *    - Many trap(4, 7, 10, 10): 0.0
     * 2. worst_class = 2:
     *    - Mild trap(0, 0, 1, 1.8): 0.0
     *    - Moderate tri(1.2, 2, 2.8): 1.0 (exact peak)
     *    - Severe trap(2.2, 3, 3, 3): 0.0
     * 3. days_since_latest = 120:
     *    - Recent trap(0, 0, 60, 150): (150 - 120) / (150 - 60) = 30 / 90 = 0.3333
     *    - Medium tri(90, 240, 400): (120 - 90) / (240 - 90) = 30 / 150 = 0.2000
     *    - Old trap(300, 500, 730, 730): 0.0
     *
     * Stage 1 Rule Strengths:
     * - S1-R1: Few(0.5) AND Mild(0) -> 0.0
     * - S1-R2: Few(0.5) AND Moderate(1.0) AND Old(0) -> 0.0
     * - S1-R3: Few(0.5) AND Moderate(1.0) AND (Recent(0.3333) OR Medium(0.2))
     *          = min(0.5, 1.0, max(0.3333, 0.2)) = 0.3333 -> Medium
     * - S1-R4: Few(0.5) AND Severe(0) -> 0.0
     * - S1-R5: Some(0.5) AND Mild(0) AND Old(0) -> 0.0
     * - S1-R6: Some(0.5) AND Mild(0) AND (Recent OR Medium) -> 0.0
     * - S1-R7: Some(0.5) AND Moderate(1.0) = min(0.5, 1.0) = 0.5000 -> Medium
     * - S1-R8..S1-R11: 0.0
     *
     * Fired Rules:
     * - S1-R3 (strength = 0.333) -> Medium
     * - S1-R7 (strength = 0.500) -> Medium
     *
     * Aggregation for Stage 1:
     * Output sets: Medium tri(25, 50, 75) clipped at max(0.333, 0.5) = 0.5.
     * Low and High are 0.
     * Since Medium is tri(25, 50, 75) and is strictly symmetric around 50,
     * clipping at 0.5 leaves a symmetric trapezoid with centroid = 50.0.
     * Hand Result Stage 1 = 50.0.
     *
     * Stage 2 Fuzzification:
     * - regulatory_risk = 50.0:
     *    - Low trap(0, 0, 20, 40): 0.0
     *    - Medium tri(25, 50, 75): 1.0
     *    - High trap(60, 80, 100, 100): 0.0
     * - news_signal = 0.0:
     *    - Low: 1.0
     *    - Medium: 0.0
     *    - High: 0.0
     * - criticality = 3:
     *    - Low: 0.0
     *    - Medium: 1.0
     *    - High: 0.0
     *
     * Stage 2 Rules:
     * - S2-R4: Reg Medium(1.0) AND News Low(1.0) = 1.0 -> Medium overall risk!
     *
     * Output set: Medium tri(20, 40, 60) clipped at 1.0.
     * Since tri(20, 40, 60) is symmetric around 40,
     * centroid = 40.0.
     * Level = 'medium' (since 25 <= 40 < 50).
     */
    it('matches hand-calculated worked example within 0.5', () => {
      const inputs: FuzzyInputs = {
        recalls12m: 2,
        worstClass: 2,
        daysSinceLatest: 120,
        newsSignal: 0,
        criticality: 3,
      };

      const result = score(inputs, config);

      // Verify Stage 1 hand calculation: 50.0
      expect(Math.abs(result.regulatoryRisk - 50.0)).toBeLessThanOrEqual(0.5);

      // Verify Stage 2 hand calculation: 40.0
      expect(Math.abs(result.score - 40.0)).toBeLessThanOrEqual(0.5);
      expect(result.level).toBe('medium');

      // Verify fired rules match hand calculation
      const ruleIds = result.firedRules.map((r) => r.ruleId);
      expect(ruleIds).toContain('S1-R3');
      expect(ruleIds).toContain('S1-R7');
      expect(ruleIds).toContain('S2-R4');
    });
  });

  describe('3. Scenario Baselines & Behavioral Properties', () => {
    it('no recalls produces Stage 1 Low and a low overall score', () => {
      const result = score(
        {
          recalls12m: 0,
          worstClass: 0,
          daysSinceLatest: 730,
          newsSignal: 0,
          criticality: 1,
        },
        config
      );

      // No recalls: Few(1.0), Mild(1.0), Old(1.0) -> S1-R1 fires -> Low regulatory risk
      expect(result.regulatoryRisk).toBeLessThan(25);
      expect(result.score).toBeLessThan(25);
      expect(result.level).toBe('low');
    });

    it('Class I recall only produces Stage 1 High regulatory risk', () => {
      const result = score(
        {
          recalls12m: 1,
          worstClass: 3, // Class I = Severe
          daysSinceLatest: 30, // Recent
          newsSignal: 0,
          criticality: 3,
        },
        config
      );

      // Few + Severe fires S1-R4 -> High regulatory risk
      expect(result.regulatoryRisk).toBeGreaterThanOrEqual(75);
    });

    it('many mild recalls produces Medium or High as docs/07 implies', () => {
      const result = score(
        {
          recalls12m: 8, // Many
          worstClass: 1, // Mild
          daysSinceLatest: 60,
          newsSignal: 0,
          criticality: 3,
        },
        config
      );

      // S1-R9: Many AND Mild -> Medium regulatory risk
      expect(result.regulatoryRisk).toBeGreaterThanOrEqual(40);
      expect(['medium', 'high']).toContain(result.level);
    });

    it('criticality High + Reg Medium produces High overall score', () => {
      // S2-R11: Reg Medium AND Crit High -> High
      const result = score(
        {
          recalls12m: 2,
          worstClass: 2,
          daysSinceLatest: 120, // Produces Reg Medium (~50)
          newsSignal: 0,
          criticality: 5, // High criticality
        },
        config
      );

      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it('demonstrates strict determinism: identical inputs produce identical scores', () => {
      const inputs: FuzzyInputs = {
        recalls12m: 4,
        worstClass: 2,
        daysSinceLatest: 90,
        newsSignal: 0,
        criticality: 3,
      };

      const res1 = score(inputs, config);
      const res2 = score(inputs, config);

      expect(res1.score).toBe(res2.score);
      expect(res1.level).toBe(res2.level);
      expect(res1.regulatoryRisk).toBe(res2.regulatoryRisk);
      expect(res1.firedRules).toEqual(res2.firedRules);
    });

    it('respects level cutoffs at 25 / 50 / 75', () => {
      expect(getCrispLevel(0.0, config.crispThresholds)).toBe('low');
      expect(getCrispLevel(24.9, config.crispThresholds)).toBe('low');
      expect(getCrispLevel(25.0, config.crispThresholds)).toBe('medium');
      expect(getCrispLevel(49.9, config.crispThresholds)).toBe('medium');
      expect(getCrispLevel(50.0, config.crispThresholds)).toBe('high');
      expect(getCrispLevel(74.9, config.crispThresholds)).toBe('high');
      expect(getCrispLevel(75.0, config.crispThresholds)).toBe('critical');
      expect(getCrispLevel(100.0, config.crispThresholds)).toBe('critical');
    });

    it('verifies every membership set definition exactly matches docs/07 specification', () => {
      // Stage 1 Inputs
      const s1Inputs = config.stage1.inputs;
      const recalls = s1Inputs.find((i) => i.name === 'recalls12m');
      expect(recalls?.sets.find((s) => s.name === 'Few')?.params).toEqual([0, 0, 1, 3]);
      expect(recalls?.sets.find((s) => s.name === 'Some')?.params).toEqual([1, 3, 6]);
      expect(recalls?.sets.find((s) => s.name === 'Many')?.params).toEqual([4, 7, 10, 10]);

      const worstClass = s1Inputs.find((i) => i.name === 'worstClass');
      expect(worstClass?.sets.find((s) => s.name === 'Mild')?.params).toEqual([0, 0, 1, 1.8]);
      expect(worstClass?.sets.find((s) => s.name === 'Moderate')?.params).toEqual([1.2, 2, 2.8]);
      expect(worstClass?.sets.find((s) => s.name === 'Severe')?.params).toEqual([2.2, 3, 3, 3]);

      const days = s1Inputs.find((i) => i.name === 'daysSinceLatest');
      expect(days?.sets.find((s) => s.name === 'Recent')?.params).toEqual([0, 0, 60, 150]);
      expect(days?.sets.find((s) => s.name === 'Medium')?.params).toEqual([90, 240, 400]);
      expect(days?.sets.find((s) => s.name === 'Old')?.params).toEqual([300, 500, 730, 730]);

      // Stage 1 Output / Stage 2 Reg Risk
      const regRisk = config.stage1.output;
      expect(regRisk.sets.find((s) => s.name === 'Low')?.params).toEqual([0, 0, 20, 40]);
      expect(regRisk.sets.find((s) => s.name === 'Medium')?.params).toEqual([25, 50, 75]);
      expect(regRisk.sets.find((s) => s.name === 'High')?.params).toEqual([60, 80, 100, 100]);

      // Stage 2 Inputs: newsSignal & criticality
      const s2Inputs = config.stage2.inputs;
      const news = s2Inputs.find((i) => i.name === 'newsSignal');
      expect(news?.sets.find((s) => s.name === 'Low')?.params).toEqual([0, 0, 0.15, 0.35]);
      expect(news?.sets.find((s) => s.name === 'Medium')?.params).toEqual([0.2, 0.45, 0.7]);
      expect(news?.sets.find((s) => s.name === 'High')?.params).toEqual([0.55, 0.75, 1, 1]);

      const crit = s2Inputs.find((i) => i.name === 'criticality');
      expect(crit?.sets.find((s) => s.name === 'Low')?.params).toEqual([1, 1, 2, 3]);
      expect(crit?.sets.find((s) => s.name === 'Medium')?.params).toEqual([2, 3, 4]);
      expect(crit?.sets.find((s) => s.name === 'High')?.params).toEqual([3, 4, 5, 5]);

      // Stage 2 Output: overall_risk
      const overall = config.stage2.output;
      expect(overall.sets.find((s) => s.name === 'Low')?.params).toEqual([0, 0, 15, 30]);
      expect(overall.sets.find((s) => s.name === 'Medium')?.params).toEqual([20, 40, 60]);
      expect(overall.sets.find((s) => s.name === 'High')?.params).toEqual([50, 70, 85]);
      expect(overall.sets.find((s) => s.name === 'Critical')?.params).toEqual([75, 90, 100, 100]);
    });

    it('clamps news_signal outside 0..1 scale strictly into [0, 1]', () => {
      const negativeResult = score(
        {
          recalls12m: 0,
          worstClass: 0,
          daysSinceLatest: 730,
          newsSignal: -0.5,
          criticality: 3,
        },
        config
      );
      expect(negativeResult.inputs.newsSignal).toBe(0.0);

      const excessiveResult = score(
        {
          recalls12m: 0,
          worstClass: 0,
          daysSinceLatest: 730,
          newsSignal: 2.75,
          criticality: 3,
        },
        config
      );
      expect(excessiveResult.inputs.newsSignal).toBe(1.0);
    });

    it('news-only guardrail: with Reg Low and News High, level never exceeds Medium', () => {
      // S2-R3: Reg Low AND News High -> Medium (guardrail: news alone cannot exceed Medium)
      const result = score(
        {
          recalls12m: 0,
          worstClass: 0,
          daysSinceLatest: 730,
          newsSignal: 0.95, // Injected high news signal
          criticality: 3,
        },
        config
      );

      expect(result.regulatoryRisk).toBeLessThan(25); // Reg Low
      expect(result.level).not.toBe('high');
      expect(result.level).not.toBe('critical');
      expect(['low', 'medium']).toContain(result.level);
    });

    it('returns score 0 with no_rules_fired when no rules fire', () => {
      const emptyGrid = new Array(101).fill(0.0);
      const defuzz = defuzzifyCentroid(emptyGrid);
      expect(defuzz.noRulesFired).toBe(true);
      expect(defuzz.centroid).toBe(0.0);
    });
  });

  describe('4. Scoring Service Integration & DB Persistence', () => {
    let testVendor: any;

    beforeEach(async () => {
      await prisma.riskScore.deleteMany({});
      await prisma.signalMatch.deleteMany({});
      await prisma.signal.deleteMany({
        where: { sourceId: { startsWith: 'TEST-RECALL-' } },
      });
      await prisma.vendor.deleteMany({});

      testVendor = await prisma.vendor.create({
        data: {
          name: 'Scoring Test Pharma',
          normalizedName: 'scoring test pharma',
          criticality: 3,
        },
      });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('E13: distinct-event counting counts distinct event_id once even across multiple product rows', async () => {
      // Create 3 signal rows with the SAME event_id '99999'
      const reportDate = new Date(); // Today
      const s1 = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-E13-1',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Scoring Test Pharma',
          eventId: '99999',
          severityRaw: 'Class II',
          severityNum: 2,
          reportDate,
          raw: {},
        },
      });

      const s2 = await prisma.signal.create({
        data: {
          source: 'openfda_enforcement',
          sourceId: 'TEST-RECALL-E13-2',
          signalType: 'recall',
          trust: 'official',
          firmName: 'Scoring Test Pharma',
          eventId: '99999', // SAME event_id
          severityRaw: 'Class II',
          severityNum: 2,
          reportDate,
          raw: {},
        },
      });

      // Link both as 'confirmed'
      await prisma.signalMatch.createMany({
        data: [
          { signalId: s1.id, vendorId: testVendor.id, status: 'confirmed', score: 1.0 },
          { signalId: s2.id, vendorId: testVendor.id, status: 'confirmed', score: 1.0 },
        ],
      });

      const scoreResult = await scoringService.computeVendorScore(testVendor.id, config);
      expect(scoreResult).toBeDefined();
      // recalls12m MUST be 1 (distinct event_id), NOT 2!
      expect(scoreResult?.inputs.recalls12m).toBe(1);
    });

    it('persists risk_scores row on score change and updates vendor.currentScore', async () => {
      await scoringService.rescoreVendors([testVendor.id]);

      const initialHistory = await prisma.riskScore.findMany({
        where: { vendorId: testVendor.id },
      });
      expect(initialHistory).toHaveLength(1);

      const vendorAfter = await prisma.vendor.findUnique({
        where: { id: testVendor.id },
      });
      expect(vendorAfter?.currentScore).toBe(initialHistory[0]?.score);
      expect(vendorAfter?.currentLevel).toBe(initialHistory[0]?.level);

      // Running rescore again with same state does NOT create another history row
      await scoringService.rescoreVendors([testVendor.id]);

      const historyAfterSecondRun = await prisma.riskScore.findMany({
        where: { vendorId: testVendor.id },
      });
      expect(historyAfterSecondRun).toHaveLength(1); // Still 1!
    });
  });
});
