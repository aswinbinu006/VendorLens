-- AlterTable signals
ALTER TABLE "signals"
  ADD COLUMN IF NOT EXISTS "recall_initiation_date" DATE,
  ADD COLUMN IF NOT EXISTS "report_date" DATE,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "content_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- AlterTable ingestion_runs
ALTER TABLE "ingestion_runs"
  ADD COLUMN IF NOT EXISTS "updated_records" INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "source_last_updated" TIMESTAMPTZ;
