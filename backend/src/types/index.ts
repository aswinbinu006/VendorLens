/**
 * Type Definitions for AI Vendor Risk & Compliance Monitor (Pharma) Backend
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
  createdAt: string;
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

export interface VendorAliasItem {
  id: number;
  alias: string;
  normalizedAlias: string;
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
  aliases?: VendorAliasItem[];
}

export type VendorDetail = VendorSummary;

export interface VendorCreateInput {
  name: string;
  country?: string | null;
  category?: string | null;
  criticality?: 1 | 2 | 3 | 4 | 5;
  notes?: string | null;
  aliases?: string[];
}

export interface VendorUpdateInput {
  name?: string;
  country?: string | null;
  category?: string | null;
  criticality?: 1 | 2 | 3 | 4 | 5;
  notes?: string | null;
  aliases?: string[];
}

export interface CsvImportErrorItem {
  line: number;
  message: string;
}

export interface CsvImportResponse {
  total: number;
  imported: number;
  skipped: number;
  errors: CsvImportErrorItem[];
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
  reportDate?: string | null;
  country?: string | null;
  eventId?: string | null;
  url: string | null;
  sourceDomain: string | null;
  matchStatus: MatchStatus;
  firmName?: string | null;
}

export interface PendingMatchItem {
  id: number;
  signalId: number;
  vendorId: number;
  vendorName: string;
  signalTitle: string | null;
  signalSummary: string | null;
  firmName: string | null;
  country: string | null;
  reportDate: string | null;
  classification: string | null; // severityRaw
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
  updatedRecords: number;
  sourceLastUpdated: string | null;
  error: string | null;
}

export interface IngestRunResponse {
  runId: string;
}

export interface FuzzyConfigData {
  version: number;
  config: Record<string, unknown>;
  isActive: boolean;
  createdBy?: number | null;
  createdAt: string;
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
