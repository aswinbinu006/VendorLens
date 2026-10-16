# 02 - Technical Requirements Document (TRD)

## 1. Purpose
Defines how the system is built to satisfy the PRD.

## 2. System context
React SPA <-> REST API (Node/Express) <-> PostgreSQL.
The API process also hosts a scheduler that calls external sources: openFDA enforcement API,
news RSS, and an SMTP provider for email.

## 3. Non-functional requirements
| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Correctness | Same inputs always produce the same score (deterministic) |
| NFR-2 | Idempotency | Re-ingesting the same record creates no duplicates (unique source + source_id) |
| NFR-3 | Explainability | Every score stores inputs, fired rules, config version |
| NFR-4 | Reliability | External failures never crash the API; failures logged in ingestion_runs |
| NFR-5 | Security | See 10-SECURITY.md |
| NFR-6 | Performance | See 11-PERFORMANCE.md (targets, to be measured) |
| NFR-7 | Portability | `docker compose up` runs the whole system |
| NFR-8 | Auditability | All state-changing actions written to audit_log |
| NFR-9 | Testability | Core logic (fuzzy, matcher, news scorer, alert rules) is pure and unit-tested |

## 4. Key technical decisions
| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language, shared types, fewer runtime errors |
| Risk model | Hand-written Mamdani fuzzy system | Explainable, no training data needed, defensible line by line |
| No ML / agents | Deliberate | No labeled data; black boxes are hard to justify in a regulated domain |
| Matching | Normalization + `pg_trgm` + human queue | Company names are messy; wrong auto-matches blame the wrong vendor |
| Scheduling | node-cron inside API process | Simple; adequate for single instance |
| Scoring timing | On ingestion, not on page load | Fast reads; deterministic history |
| Auth | Single admin, JWT in httpOnly cookie | Smallest secure design for this scope |
| Data sources behind adapters | `SourceAdapter` interface | Swap or add sources without touching core logic |

## 5. Components
| Component | Responsibility |
|---|---|
| `ingestion` | Fetch from adapters, normalize, upsert signals, record runs |
| `matching` | Normalize names, trigram search, create signal_matches |
| `news-scorer` | Rule-based severity, credibility, recency, dedupe |
| `fuzzy` | Pure functions: fuzzify, infer, defuzzify, explain |
| `scoring` | Gather inputs for a vendor, call fuzzy, persist risk_scores |
| `alerts` | Evaluate hard/soft rules, dedupe, create alerts, notify |
| `audit` | Append-only action log |
| `auth` | Login, session, password hashing |

## 6. Data flow
See 04-ARCHITECTURE.md (sequence diagram) and 08-FLAGGING-LOGIC.md.

## 7. Ingestion design (E12 Window-Based Bulk Ingestion)
- **Decoupled from Vendors**: We do NOT query openFDA per vendor. We pull ALL drug enforcement records for a report_date window (`search=report_date:[YYYYMMDD+TO+YYYYMMDD]`) and store them in `signals` (`signal_type = 'recall'`, `trust = 'official'`). Vendor names never leave the server; matching to vendors occurs entirely locally in Phase 4.
- **First Run (Backfill)**: When no previous successful run exists, the engine backfills `BACKFILL_MONTHS` (default 24), fetched in calendar-month chunks to prevent approaching openFDA's ~26,000 skip limit. Paging is handled via `limit` (100) and `skip`. If `meta.results.total > 25000` is detected, the window is recursively bisected into sub-chunks.
- **Incremental Runs**: Subsequent scheduled or manual incremental runs re-fetch a trailing window of `SYNC_WINDOW_DAYS` (default 90) so corrections to recent records are detected via `content_hash`. Manual mode `"full"` re-fetches the entire `BACKFILL_MONTHS` range. Corrections to records older than the trailing window are caught only by a full resync.
- **Change Detection & Idempotency**: Upsert by `(source, source_id)` using SHA-256 `content_hash` over a stable, key-sorted canonical JSON serialization of the raw record. Unchanged records update nothing (`unchanged_records`); changed records update fields and `updated_at` (`updated_records`); new records insert (`new_records`).
- **Guard (b)**: If a single run observes the same `source_id` twice with conflicting `content_hash`, a warning is logged, noted in the run's error notes, and existing records are never silently overwritten.
- **Single-Flight Concurrency**: A Postgres advisory lock (`pg_try_advisory_lock`) guarantees only one ingestion run executes at a time. Concurrent requests immediately return `409 CONFLICT`. Any stale "running" rows upon server restart are marked `failed`.
- **HTTP Resiliency & Redaction**: 10-second request timeout, up to 3 retries with exponential backoff plus jitter on 5xx, 429 (respecting `Retry-After`), request pacing capped at $\le 2$ requests/second. The `api_key` parameter is strictly redacted from all stored URLs, raw payloads, logs, and error messages.
- **Run Tracking**: Each execution records an `ingestion_runs` row: status (`running` -> `success` | `partial` | `failed`), `fetched`, `new_records`, `updated_records`, `source_last_updated` (from API `meta.last_updated`), and error text.
- **Phase 4 Hook**: Calls `onSignalsChanged(insertedIds, updatedIds)` upon completion (no-op in Phase 3).

## 8. External source assumptions (VERIFY on day 1)
- openFDA `drug/enforcement.json` exposes: recalling_firm, classification, status, reason_for_recall,
  product_description, recall_initiation_date, report_date, recall_number
- `recall_number` is a stable unique record ID
- Update frequency of the enforcement data (poll no faster than it changes)
- API key limits
- News RSS terms of use and stability; adapter must be swappable

## 9. Error handling
- API errors use one JSON shape (06-API.md)
- Unhandled errors: logged with request ID, generic message to client
- Frontend: loading, empty, and error states on every data view

## 10. Observability
Structured JSON logs (pino), request IDs, `/health` and `/ready` endpoints,
ingestion status page as a user-facing health view.

## 11. Testing strategy
| Level | Tools | What |
|---|---|---|
| Unit | Vitest | Membership functions, rules, defuzzification (hand-computed expectations), normalizer, news scorer, alert rules |
| Integration | Vitest + Supertest + test Postgres | Auth, vendor CRUD, import, match review, alert lifecycle, idempotent ingestion with recorded real responses |
| Manual E2E | Checklist in 15-PROJECT-PLAN-AND-DEMO.md | Full demo path on a clean environment |

## 12. Deployment
- Local/self-host: Docker Compose (db, api, web)
- Hosted demo: Render or Railway with managed Postgres; HTTPS provided by the platform

## 13. Open items
- Final similarity thresholds (tuned on real data on day 1)
- Email provider choice
- Whether to ship the score backtest