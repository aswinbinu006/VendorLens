# 03 - Features

Priority: M = Must (frozen 15 Oct), S = Should, R = Roadmap.

| ID | Feature | Pri | Description | Acceptance |
|---|---|---|---|---|
| F-01 | Login | M | Single admin account created from env on first start | Bad login rejected; rate-limited; cookie httpOnly |
| F-02 | Vendor watchlist | M | Add, edit, delete vendors; fields: name, country, category, criticality 1-5, notes | Duplicate normalized names blocked |
| F-03 | CSV import | M | Upload CSV of vendors | Row-level errors reported; limits on size/rows |
| F-04 | FDA recall ingestion | M | Scheduled + "Run now"; pulls recalls for watchlist vendors | Idempotent; run recorded |
| F-05 | News ingestion | M | Pulls recent news per vendor; rule-based severity; labeled unverified | Source domain and link shown |
| F-06 | Name matching + review queue | M | Auto for exact/alias; pending for close; ignore weak | Confirm/reject recorded in audit log |
| F-07 | Fuzzy risk scoring | M | Two-stage Mamdani system; stores fired rules | Score reproducible by hand |
| F-08 | Score history | M | Chart of score over time per vendor | Shows config version |
| F-09 | Dashboard | M | Ranked vendors; KPI cards; risk distribution; last refresh | Sort/filter by level |
| F-10 | Vendor detail | M | Gauge, why-this-score, official vs unverified timelines, source links | Every item links to source |
| F-11 | Alerts | M | Hard + soft alert rules, dedupe, inbox, badge | One alert per cause |
| F-12 | Alert review | M | Reviewed/dismissed with note | Audit entry written |
| F-13 | Ingestion status | M | Runs table, last success, errors, stale warning | Truthful state |
| F-14 | Audit log view | M | Chronological list of actions | Filter by entity/action |
| F-15 | Fuzzy config viewer | M | Variables, curves, rules, active version | Read-only |
| F-16 | Email alerts | S | Email on High/Critical alerts | Send failures logged, not fatal |
| F-17 | PDF vendor report | S | Printable summary of a vendor | Contains sources and timestamp |
| F-18 | Fuzzy config editor | S | Edit and version rules/curves | Validates before activation |
| F-19 | Certificate cross-check | R | Verify certificate numbers against public registries | - |
| F-20 | CDSCO/EU/WHO sources | R | Additional adapters | - |
| F-21 | CAPA/audit tracking | R | Internal records | - |
| F-22 | Roles and SSO | R | Multi-user access control | - |
| F-23 | Local bulk matching | R | Match against downloaded datasets so vendor names never leave | - |