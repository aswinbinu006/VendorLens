# 06 - REST API

Base path `/api/v1`. JSON only. Auth via httpOnly cookie set by login. Mutating requests must send the header `X-Requested-With: fetch`.

## Conventions
- Pagination: `?page=1&pageSize=25` returns `{ data: T[], page, pageSize, total }`
- Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
- Codes: `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION_ERROR` 422, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500
- All input validated with Zod; unknown fields rejected

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /auth/login | Email + password; sets cookie |
| POST | /auth/logout | Clears cookie |
| GET | /auth/me | Current user |
| GET | /vendors | List (filter: level, q; sort: score, name) |
| POST | /vendors | Create vendor |
| GET | /vendors/:id | Vendor with current score |
| PATCH | /vendors/:id | Edit name, country, category, criticality, notes |
| DELETE | /vendors/:id | Remove vendor |
| POST | /vendors/import | CSV upload (multipart), returns per-row result |
| GET | /vendors/:id/signals | Signals, filter by trust |
| GET | /vendors/:id/score | Latest score with fired rules and inputs |
| GET | /vendors/:id/score-history | Time series |
| GET | /matches/pending | Pending matches |
| POST | /matches/:id/confirm | Confirm and rescore |
| POST | /matches/:id/reject | Reject |
| GET | /dashboard/summary | KPI numbers, level distribution, last refresh |
| GET | /alerts | List (filter: status, level) |
| PATCH | /alerts/:id | Set status + note |
| GET | /fuzzy-config | Active config |
| PUT | /fuzzy-config | New version (Should) |
| POST | /ingest/run | Manual run (rate-limited) |
| GET | /ingestion-runs | Run history |
| GET | /audit-log | Filterable log |
| GET | /health, /ready | Liveness, readiness (no auth) |

## Shape of key payloads (types, not data)
```ts
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface VendorAliasItem {
  id: number;
  alias: string;
  normalizedAlias: string;
}

interface VendorSummary {
  id: number; name: string; country: string | null; category: string | null;
  criticality: 1|2|3|4|5;
  currentScore: number | null; currentLevel: RiskLevel | null; scoredAt: string | null;
  notes?: string | null;
  createdAt?: string;
  aliases?: VendorAliasItem[];
}

interface VendorCreateInput {
  name: string;
  country?: string | null;
  category?: string | null;
  criticality?: 1|2|3|4|5;
  notes?: string | null;
  aliases?: string[]; // max 20, each 2..200 chars
}

interface VendorUpdateInput {
  name?: string;
  country?: string | null;
  category?: string | null;
  criticality?: 1|2|3|4|5;
  notes?: string | null;
  aliases?: string[]; // replaces existing aliases
}

interface CsvImportErrorItem {
  line: number; // 1-based file line number
  message: string;
}

interface CsvImportResponse {
  total: number;
  imported: number;
  skipped: number;
  errors: CsvImportErrorItem[];
}

interface FiredRule {
  ruleId: string; description: string; strength: number; // 0..1
  stage: 1 | 2; outputSet: string;
}

interface ScoreDetail {
  vendorId: number; score: number; level: RiskLevel; configVersion: number;
  inputs: { recalls12m: number; worstClass: number; daysSinceLatest: number;
            newsSignal: number; criticality: number; regulatoryRisk: number };
  firedRules: FiredRule[]; computedAt: string;
}

interface SignalItem {
  id: number; type: 'recall' | 'news'; trust: 'official' | 'unverified';
  title: string | null; summary: string | null; severityRaw: string | null;
  eventDate: string | null; url: string | null; sourceDomain: string | null;
  matchStatus: 'auto' | 'pending' | 'confirmed' | 'rejected';
}

interface IngestRunRequest {
  mode: 'incremental' | 'full'; // default: 'incremental'
}

interface IngestRunResponse {
  runId: string;
}

interface IngestionRunItem {
  id: number;
  source: string;
  trigger: 'schedule' | 'manual';
  startedAt: string;
  finishedAt: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  fetched: number;
  newRecords: number;
  updatedRecords: number;
  sourceLastUpdated: string | null;
  error: string | null;
}

interface AlertItem {
  id: number;
  vendorId: number | null;
  vendorName?: string | null;
  signalId: number | null;
  kind: 'new_official_signal' | 'class_i_recall' | 'level_increase' | 'news_cluster' | 'ingestion_failure';
  level: RiskLevel;
  message: string;
  dedupeKey: string;
  status: 'new' | 'reviewed' | 'dismissed';
  note: string | null;
  createdAt: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  sourceUrl?: string | null;
}

interface DashboardSummary {
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

interface ScoreHistoryItem {
  id: number;
  score: number;
  level: RiskLevel;
  configVersion: number;
  computedAt: string;
}

interface AuditLogItem {
  id: number;
  userId: number | null;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
```