/**
 * API Contract Types matching docs/06-API.md exactly
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type MatchStatus = 'auto' | 'pending' | 'confirmed' | 'rejected';
export type SignalType = 'recall' | 'news';
export type TrustLevel = 'official' | 'unverified';
export type AlertStatus = 'new' | 'reviewed' | 'dismissed';
export type AlertKind =
  | 'new_official_signal'
  | 'class_i_recall'
  | 'level_increase'
  | 'news_cluster'
  | 'ingestion_failure';
export type RunStatus = 'running' | 'success' | 'partial' | 'failed';

export interface User {
  id: number;
  email: string;
  createdAt?: string;
  isSuperAdmin?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorDetail {
  path?: string[];
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  error: {
    code:
      | 'UNAUTHENTICATED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'RATE_LIMITED'
      | 'INTERNAL';
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface VendorSummary {
  id: number;
  name: string;
  country: string | null;
  category: string | null;
  criticality: 1 | 2 | 3 | 4 | 5;
  currentScore: number | null;
  currentLevel: RiskLevel | null;
  scoredAt: string | null;
  notes?: string | null;
  createdAt?: string;
  aliases?: Array<{ id: number; alias: string }>;
}

export type VendorDetail = VendorSummary;

export interface VendorCreateInput {
  name: string;
  country?: string;
  category?: string;
  criticality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  aliases?: string[];
}

export interface VendorUpdateInput {
  name?: string;
  country?: string;
  category?: string;
  criticality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface CsvImportRowResult {
  row: number;
  name: string;
  status: 'imported' | 'error';
  error?: string;
}

export interface CsvImportResponse {
  totalRows: number;
  imported: number;
  failed: number;
  results: CsvImportRowResult[];
}

export interface FiredRule {
  ruleId: string;
  description: string;
  strength: number; // 0..1
  stage: 1 | 2;
  outputSet: string;
}

export interface ScoreInputs {
  recalls12m: number;
  worstClass: number;
  daysSinceLatest: number;
  newsSignal: number;
  criticality: number;
  regulatoryRisk: number;
}

export interface ScoreDetail {
  vendorId: number;
  score: number;
  level: RiskLevel;
  configVersion: number;
  inputs: ScoreInputs;
  firedRules: FiredRule[];
  computedAt: string;
}

export interface ScoreHistoryItem {
  id: number;
  score: number;
  level: RiskLevel;
  configVersion: number;
  computedAt: string;
}

export interface SignalItem {
  id: number;
  type: SignalType;
  trust: TrustLevel;
  title: string | null;
  summary: string | null;
  severityRaw: string | null;
  severityNum: number | null;
  eventDate: string | null;
  recallInitiationDate?: string | null;
  reportDate?: string | null;
  country?: string | null;
  eventId?: string | null;
  url: string | null;
  sourceDomain: string | null;
  matchStatus: MatchStatus;
  firmName?: string | null;
}

export interface PendingMatchItem {
  id: number; // match id
  signalId: number;
  vendorId: number;
  vendorName: string;
  signalTitle: string | null;
  signalSummary: string | null;
  firmName: string | null;
  severityRaw: string | null;
  eventDate: string | null;
  source: string;
  url: string | null;
  similarityScore: number;
  status: MatchStatus;
}

export interface DashboardSummary {
  totalVendors: number;
  newAlerts: number;
  pendingMatches: number;
  highOrCriticalVendors: number;
  lastDataRefresh: string | null;
  isStale: boolean;
  newsEnabled: boolean;
  distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRiskyVendors: VendorSummary[];
  latestAlerts: AlertItem[];
}

export interface AlertItem {
  id: number;
  vendorId: number | null;
  vendorName?: string | null;
  signalId: number | null;
  kind: AlertKind;
  level: RiskLevel;
  message: string;
  dedupeKey: string;
  status: AlertStatus;
  note: string | null;
  createdAt: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  sourceUrl?: string | null;
}

export interface IngestionRunItem {
  id: number;
  source: string;
  trigger: 'schedule' | 'manual';
  startedAt: string;
  finishedAt: string | null;
  status: RunStatus;
  fetched: number;
  newRecords: number;
  updatedRecords?: number;
  sourceLastUpdated?: string | null;
  error: string | null;
}

export interface AuditLogItem {
  id: number;
  userId: number | null;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface FuzzyConfigVariableSet {
  name: string;
  type: 'triangle' | 'trapezoid';
  params: number[];
}

export interface FuzzyConfigVariable {
  name: string;
  range: [number, number];
  sets: FuzzyConfigVariableSet[];
}

export interface FuzzyRuleDef {
  id: string;
  stage: 1 | 2;
  antecedents: Array<{
    variable: string;
    set: string;
    operator?: 'AND' | 'OR';
  }>;
  consequent: {
    variable: string;
    set: string;
  };
  description: string;
}

export interface FuzzyConfigData {
  version: number;
  isActive: boolean;
  stage1: {
    inputs: FuzzyConfigVariable[];
    output: FuzzyConfigVariable;
    rules: FuzzyRuleDef[];
  };
  stage2: {
    inputs: FuzzyConfigVariable[];
    output: FuzzyConfigVariable;
    rules: FuzzyRuleDef[];
  };
  crispThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}
