import type { RiskLevel } from '../types/index.js';
import type {
  FuzzyConfig,
  FuzzyInputs,
  FuzzyRuleDefinition,
  FuzzyScoreResult,
  FuzzyStageDefinition,
  FiredRuleInfo,
  FuzzyVariableDefinition,
} from './types.js';
import { evaluateSetMembership } from './membership.js';

/**
 * Fuzzifies crisp inputs across defined fuzzy variables and sets.
 */
export function fuzzify(
  inputs: Record<string, number>,
  variableDefs: FuzzyVariableDefinition[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const varDef of variableDefs) {
    const rawVal = inputs[varDef.name];
    const val = rawVal !== undefined ? rawVal : 0;
    result[varDef.name] = {};

    for (const setDef of varDef.sets) {
      result[varDef.name]![setDef.name] = evaluateSetMembership(val, setDef);
    }
  }

  return result;
}

/**
 * Evaluates a single rule's firing strength (Mamdani min/max).
 * Antecedents across different variables are ANDed (min).
 * Multiple sets for the same antecedent (array) are ORed (max).
 */
export function evaluateRuleStrength(
  rule: FuzzyRuleDefinition,
  memberships: Record<string, Record<string, number>>
): number {
  if (!rule.antecedents || rule.antecedents.length === 0) {
    return 0.0;
  }

  const antecedentStrengths: number[] = [];

  for (const ant of rule.antecedents) {
    const varMemberships = memberships[ant.variable] || {};

    if (Array.isArray(ant.set)) {
      // OR condition: max over specified sets
      let maxOr = 0.0;
      for (const setName of ant.set) {
        const mu = varMemberships[setName] ?? 0.0;
        if (mu > maxOr) maxOr = mu;
      }
      antecedentStrengths.push(maxOr);
    } else {
      const mu = varMemberships[ant.set] ?? 0.0;
      antecedentStrengths.push(mu);
    }
  }

  // AND condition across all antecedents: min
  return Math.min(...antecedentStrengths);
}

/**
 * Runs inference for a single fuzzy stage (Stage 1 or Stage 2).
 * Aggregates clipped output sets over a 0..100 grid with step 1.
 */
export function inferStage(
  stageDef: FuzzyStageDefinition,
  inputValues: Record<string, number>
): {
  grid: number[];
  firedRules: FiredRuleInfo[];
} {
  const memberships = fuzzify(inputValues, stageDef.inputs);
  const firedRules: FiredRuleInfo[] = [];

  // Evaluate rule firing strengths
  const ruleStrengths = new Map<FuzzyRuleDefinition, number>();
  for (const rule of stageDef.rules) {
    const strength = evaluateRuleStrength(rule, memberships);
    if (strength > 0) {
      ruleStrengths.set(rule, strength);
      firedRules.push({
        ruleId: rule.id,
        description: rule.description,
        strength: Math.round(strength * 1000) / 1000,
        stage: rule.stage,
        outputSet: rule.consequent.set,
      });
    }
  }

  // Grid points: 0, 1, 2, ..., 100 (101 points total)
  const grid = new Array(101).fill(0.0);

  // Map output sets for easy lookup
  const outputSetMap = new Map(stageDef.output.sets.map((s) => [s.name, s]));

  for (let x = 0; x <= 100; x++) {
    let maxAgg = 0.0;

    for (const [rule, strength] of ruleStrengths.entries()) {
      const setDef = outputSetMap.get(rule.consequent.set);
      if (!setDef) continue;

      const mu = evaluateSetMembership(x, setDef);
      const clipped = Math.min(strength, mu);

      if (clipped > maxAgg) {
        maxAgg = clipped;
      }
    }

    grid[x] = maxAgg;
  }

  return { grid, firedRules };
}

/**
 * Defuzzification using Centroid over discrete grid [0..100] with step 1.
 */
export function defuzzifyCentroid(grid: number[]): {
  centroid: number;
  noRulesFired: boolean;
} {
  let sumNumerator = 0.0;
  let sumDenominator = 0.0;

  for (let x = 0; x < grid.length; x++) {
    const mu = grid[x] ?? 0.0;
    sumNumerator += x * mu;
    sumDenominator += mu;
  }

  if (sumDenominator === 0.0) {
    return { centroid: 0.0, noRulesFired: true };
  }

  return {
    centroid: sumNumerator / sumDenominator,
    noRulesFired: false,
  };
}

/**
 * Maps a crisp score (0..100) to a RiskLevel based on thresholds.
 */
export function getCrispLevel(
  score: number,
  thresholds: FuzzyConfig['crispThresholds']
): RiskLevel {
  if (score < thresholds.low) return 'low';
  if (score < thresholds.medium) return 'medium';
  if (score < thresholds.high) return 'high';
  return 'critical';
}

/**
 * Top-level pure scoring function.
 * Evaluates Stage 1 (Regulatory Risk), then Stage 2 (Overall Risk),
 * and returns crisp score, level, inputs, and fired rules.
 * No I/O, no randomness, no Date.now().
 */
export function score(inputs: FuzzyInputs, config: FuzzyConfig): FuzzyScoreResult {
  // 1. Stage 1: Regulatory Risk
  const stage1Inputs: Record<string, number> = {
    recalls12m: Math.max(0, Math.min(10, inputs.recalls12m)),
    worstClass: Math.max(0, Math.min(3, inputs.worstClass)),
    daysSinceLatest: Math.max(0, Math.min(730, inputs.daysSinceLatest)),
  };

  const stage1Result = inferStage(config.stage1, stage1Inputs);
  const stage1Defuzz = defuzzifyCentroid(stage1Result.grid);

  const rawRegulatoryRisk = stage1Defuzz.centroid;
  const roundedRegulatoryRisk = Math.round(rawRegulatoryRisk * 10) / 10;

  // 2. Stage 2: Overall Risk
  const stage2Inputs: Record<string, number> = {
    regulatory_risk: rawRegulatoryRisk,
    newsSignal: Math.max(0, Math.min(1, inputs.newsSignal)),
    criticality: Math.max(1, Math.min(5, inputs.criticality)),
  };

  const stage2Result = inferStage(config.stage2, stage2Inputs);
  const stage2Defuzz = defuzzifyCentroid(stage2Result.grid);

  const rawOverallRisk = stage2Defuzz.centroid;
  const roundedOverallRisk = Math.round(rawOverallRisk * 10) / 10;

  const allFiredRules = [...stage1Result.firedRules, ...stage2Result.firedRules];
  const noRulesFired = stage1Defuzz.noRulesFired && stage2Defuzz.noRulesFired;

  const level = getCrispLevel(roundedOverallRisk, config.crispThresholds);

  return {
    score: roundedOverallRisk,
    rawScore: rawOverallRisk,
    level,
    inputs: {
      recalls12m: stage1Inputs.recalls12m ?? 0,
      worstClass: stage1Inputs.worstClass ?? 0,
      daysSinceLatest: stage1Inputs.daysSinceLatest ?? 730,
      newsSignal: stage2Inputs.newsSignal ?? 0,
      criticality: stage2Inputs.criticality ?? 3,
      regulatoryRisk: roundedRegulatoryRisk,
    },
    regulatoryRisk: roundedRegulatoryRisk,
    firedRules: allFiredRules,
    configVersion: config.version,
    ...(noRulesFired ? { noRulesFired: true } : {}),
  };
}
