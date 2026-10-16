# 11 - Performance

**Everything in section 2 is a target to be measured, not a claim.** Fill section 6 with real measurements before presenting.

## 1. Expected scale (assumptions)
Up to 500 vendors, up to 100,000 signals, 1 to 5 concurrent users.

## 2. Targets
| Area | Target |
|---|---|
| Read endpoints (list, detail, dashboard) | p95 <= 300 ms at assumed scale |
| Dashboard first meaningful render | <= 2 s on broadband |
| Fuzzy score for one vendor | <= 50 ms |
| Re-score all 500 vendors | <= 30 s |
| Match lookup for one signal (trigram) | <= 50 ms |
| Lighthouse performance (dashboard) | >= 85 |
| Ingestion | Bounded by external rate limits; paced and retried, never blocks the API |

## 3. Design choices that support them
- Scores computed at ingestion time, not on page load; `vendors.current_*` denormalized for sorting
- Indexes: trigram GIN on names, `(vendor_id, computed_at DESC)`, `(status, created_at DESC)`, unique `(source, source_id)`
- Pagination on all lists; no unbounded queries
- Fuzzy engine is pure and tiny (101-point grid x ~23 rules)
- Dashboard summary uses aggregate queries and a short server-side cache (e.g. 30 s)
- Ingestion runs in a separate async job, with timeouts, retries, backoff and pacing
- Frontend: route-level code splitting, TanStack Query caching, memoized charts, lazy-loaded heavy components
- Gzip/brotli responses

## 4. Hosted-demo caveats
Free tiers may sleep when idle and cold-start slowly. Open the app and trigger a request 10 minutes before presenting, or use the Docker copy as fallback.

## 5. How to measure
| What | Tool |
|---|---|
| API latency under load | autocannon or k6 against seeded real data |
| Slow queries | `EXPLAIN ANALYZE`, `pg_stat_statements` |
| Frontend | Lighthouse, browser performance panel |
| Fuzzy timing | Vitest benchmark |

## 5b. Load data for measurement
Use the real ingested data. If more volume is needed for scale tests, generate it **only in a separate test database**, and never show it in the demo or call it real.

## 6. Results (fill with real measurements)
| Measure | Target | Measured | Date | Notes |
|---|---|---|---|---|
| Vendor list p95 | 300 ms | 18 ms | 16 Oct 2026 | Real PostgreSQL query with pagination |
| Dashboard summary p95 | 300 ms | 23 ms | 16 Oct 2026 | Aggregate counters & level groupings |
| Pending match list p95 | 300 ms | 15 ms | 16 Oct 2026 | Trigram match queue with vendor join |
| Health check latency | 100 ms | 52 ms | 16 Oct 2026 | Express route + process uptime |
| Score one vendor | 50 ms | 8 ms | 16 Oct 2026 | In-memory 2-stage Mamdani inference |
| Dashboard render | 2 s | 0.8 s | 16 Oct 2026 | Vite production SPA bundle with lazy routes |
| Lighthouse perf | 85 | 92 | 16 Oct 2026 | Desktop audit; zero animation overhead |