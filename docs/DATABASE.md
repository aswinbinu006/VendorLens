# 05 - Database (PostgreSQL 16+)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE match_status  AS ENUM ('auto','pending','confirmed','rejected');
CREATE TYPE signal_type   AS ENUM ('recall','news');
CREATE TYPE trust_level   AS ENUM ('official','unverified');
CREATE TYPE risk_level    AS ENUM ('low','medium','high','critical');
CREATE TYPE alert_status  AS ENUM ('new','reviewed','dismissed');
CREATE TYPE alert_kind    AS ENUM ('new_official_signal','class_i_recall','level_increase','news_cluster','ingestion_failure');
CREATE TYPE run_status    AS ENUM ('running','success','partial','failed');

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  country         TEXT,
  category        TEXT,
  criticality     SMALLINT NOT NULL DEFAULT 3 CHECK (criticality BETWEEN 1 AND 5),
  notes           TEXT,
  current_score   REAL,
  current_level   risk_level,
  scored_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vendors_name_trgm ON vendors USING GIN (normalized_name gin_trgm_ops);
CREATE INDEX vendors_level_score ON vendors (current_level, current_score DESC);

CREATE TABLE vendor_aliases (
  id               BIGSERIAL PRIMARY KEY,
  vendor_id        BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  alias            TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  UNIQUE (vendor_id, normalized_alias)
);
CREATE INDEX aliases_trgm ON vendor_aliases USING GIN (normalized_alias gin_trgm_ops);

CREATE TABLE signals (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,            -- 'openfda_enforcement' | 'news_rss'
  source_id     TEXT NOT NULL,            -- recall_number, or hash of article URL
  signal_type   signal_type NOT NULL,
  trust         trust_level NOT NULL,
  firm_name     TEXT,                     -- recalling firm as published
  severity_raw  TEXT,                     -- e.g. 'Class I'
  severity_num  SMALLINT,                 -- recalls: Class I=3, II=2, III=1
  term_weight   REAL,                     -- news: matched-term weight 0..1
  source_domain TEXT,                     -- news
  title         TEXT,
  summary       TEXT,
  event_date    DATE,
  url           TEXT,
  raw           JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX signals_event_date ON signals (event_date DESC);

CREATE TABLE signal_matches (
  id         BIGSERIAL PRIMARY KEY,
  signal_id  BIGINT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  vendor_id  BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status     match_status NOT NULL,
  score      REAL NOT NULL,               -- similarity 0..1
  decided_by BIGINT REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  UNIQUE (signal_id, vendor_id)
);
CREATE INDEX matches_vendor_status ON signal_matches (vendor_id, status);

CREATE TABLE fuzzy_config (
  id         SERIAL PRIMARY KEY,
  version    INT UNIQUE NOT NULL,
  config     JSONB NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT false,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_config ON fuzzy_config (is_active) WHERE is_active;

CREATE TABLE risk_scores (
  id             BIGSERIAL PRIMARY KEY,
  vendor_id      BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  score          REAL NOT NULL,
  level          risk_level NOT NULL,
  inputs         JSONB NOT NULL,
  fired_rules    JSONB NOT NULL,
  config_version INT NOT NULL,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scores_vendor_time ON risk_scores (vendor_id, computed_at DESC);

CREATE TABLE alerts (
  id          BIGSERIAL PRIMARY KEY,
  vendor_id   BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
  signal_id   BIGINT REFERENCES signals(id) ON DELETE SET NULL,
  kind        alert_kind NOT NULL,
  level       risk_level NOT NULL,
  message     TEXT NOT NULL,
  dedupe_key  TEXT UNIQUE NOT NULL,
  status      alert_status NOT NULL DEFAULT 'new',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX alerts_status_time ON alerts (status, created_at DESC);

CREATE TABLE ingestion_runs (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,
  trigger     TEXT NOT NULL CHECK (trigger IN ('schedule','manual')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      run_status NOT NULL,
  fetched     INT NOT NULL DEFAULT 0,
  new_records INT NOT NULL DEFAULT 0,
  error       TEXT
);

CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_time ON audit_log (created_at DESC);
```

## Notes
- `signals` stores each external record once; `signal_matches` links it to vendors, so one article can concern several vendors.
- `vendors.current_*` is a denormalized copy of the latest score for fast dashboard sorting. `risk_scores` keeps full history.
- `alerts.dedupe_key` format: `<kind>:<vendor_id>:<signal_id or level>` guarantees one alert per cause.
- Create the trigram indexes in a raw SQL migration, since Prisma cannot express them natively.
- Use parameterized queries for all `pg_trgm` lookups.