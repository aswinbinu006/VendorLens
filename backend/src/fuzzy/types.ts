import type { RiskLevel } from '../types/index.js';

export type FuzzySetType = 'trapezoid' | 'triangle';

export interface FuzzySetDefinition {
  name: string;
  type: FuzzySetType;
  params: number[]; // [a, b, c, d] for trapezoid, [a, b, c] for triangle
}

export interface FuzzyVariableDefinition {
  name: string;
  range: [number, number];
  sets: FuzzySetDefinition[];
}

export interface RuleAntecedent {
  variable: string;
  set: string | string[]; // Single set, or array representing OR condition
}

export interface RuleConsequent {
  variable: string;
  set: string;
}

export interface FuzzyRuleDefinition {
  id: string;
  stage: 1 | 2;
  antecedents: RuleAntecedent[];
  consequent: RuleConsequent;
  description: string;
}

export interface FuzzyStageDefinition {
  inputs: FuzzyVariableDefinition[];
  output: FuzzyVariableDefinition;
  rules: FuzzyRuleDefinition[];
}

export interface FuzzyConfig {
  version: number;
  isActive: boolean;
  stage1: FuzzyStageDefinition;
  stage2: FuzzyStageDefinition;
  crispThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface FiredRuleInfo {
  ruleId: string;
  description: string;
  strength: number; // 0..1
  stage: 1 | 2;
  outputSet: string;
}

export interface FuzzyInputs {
  recalls12m: number;
  worstClass: number;
  daysSinceLatest: number;
  newsSignal: number;
  criticality: number;
}

export interface FuzzyScoreResult {
  score: number; // 0..100 rounded to 1 decimal place
  rawScore: number;
  level: RiskLevel;
  inputs: {
    recalls12m: number;
    worstClass: number;
    daysSinceLatest: number;
    newsSignal: number;
    criticality: number;
    regulatoryRisk: number;
  };
  regulatoryRisk: number;
  firedRules: FiredRuleInfo[];
  configVersion: number;
  noRulesFired?: boolean;
}
