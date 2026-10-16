# 04 - Architecture

## 1. Component diagram
```mermaid
flowchart LR
  subgraph External
    FDA[openFDA Enforcement API]
    NEWS[News RSS]
    SMTP[SMTP provider]
  end
  subgraph API[API server - Node/Express/TypeScript]
    SCH[Scheduler]
    ING[Ingestion adapters]
    MAT[Matcher]
    NSC[News scorer]
    FUZ[Fuzzy engine]
    ALR[Alert service]
    REST[REST endpoints]
  end
  DB[(PostgreSQL)]
  WEB[React SPA]
  SCH --> ING
  FDA --> ING
  NEWS --> ING
  ING --> DB
  ING --> MAT
  MAT --> NSC
  MAT --> FUZ
  NSC --> FUZ
  FUZ --> DB
  FUZ --> ALR
  ALR --> DB
  ALR --> SMTP
  WEB <--> REST
  REST <--> DB
```

## 2. Ingestion & Flagging sequence (E12 Window-Based Architecture)
- **Vendor Privacy**: openFDA is queried strictly for time windows (`report_date:[YYYYMMDD+TO+YYYYMMDD]`). Vendor names never leave the server.
- **Bulk Ingestion**: Records are normalized, hashed (`content_hash`), and upserted in batches into PostgreSQL.
- **Hook Dispatch**: Only inserted and updated signal IDs trigger `onSignalsChanged(insertedIds, updatedIds)` for Phase 4 matching.

```mermaid
sequenceDiagram
  participant S as Scheduler / Admin
  participant I as Ingestion Service
  participant FDA as openFDA (Public API)
  participant D as PostgreSQL
  participant M as Matcher (Phase 4)
  participant F as Fuzzy engine (Phase 5)
  participant A as Alerts (Phase 6)

  S->>I: run(mode: incremental | full)
  I->>FDA: fetchWindow(dateRange) [paged, paced, retried]
  FDA-->>I: recall enforcement records
  I->>D: upsert signals (ON CONFLICT DO UPDATE WHERE content_hash differs)
  I->>D: write ingestion_runs (status, counts, source_last_updated)
  I->>M: onSignalsChanged(insertedIds, updatedIds)
  M->>D: write signal_matches (auto / pending)
  M->>F: vendors with new confirmed matches
  F->>D: write risk_scores + vendors.current_*
  F->>A: previous vs new level, hard-flag facts
  A->>D: insert alerts (deduped)
  A-->>A: send email if High/Critical
```

## 3. Repository layout
```
vendor-risk-monitor/
├─ apps/
│  ├─ api/
│  │  ├─ prisma/                  # schema + SQL migrations (pg_trgm, indexes)
│  │  └─ src/
│  │     ├─ config/               # env parsing (Zod)
│  │     ├─ middleware/           # auth, validate, rate-limit, error
│  │     ├─ modules/
│  │     │  ├─ auth/ vendors/ signals/ matching/
│  │     │  ├─ scoring/ alerts/ ingestion/ news/ audit/
│  │     ├─ fuzzy/               # pure engine + default config
│  │     ├─ jobs/                # cron registration
│  │     └─ index.ts
│  └─ web/
│     └─ src/ { pages, components, api, hooks, lib }
├─ docs/
├─ docker-compose.yml
├─ .env.example
└─ README.md
```
Use npm workspaces so API and web share TypeScript types from a `packages/types` folder if desired.

## 4. Deployment topologies
| Mode | Layout | Use |
|---|---|---|
| Self-hosted | Docker Compose: db, api, web on the company's machine/network | Data stays inside the network |
| Hosted demo | Render/Railway: web (static), api, managed Postgres | Presentation link |

Same code, different configuration.

## 5. Boundaries
- Only the API talks to the database and external sources
- The fuzzy engine has no I/O (pure), so it can be tested without a database
- The frontend never calls external sources directly