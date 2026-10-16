-- E13: Add signals.event_id TEXT, backfill from raw->>'event_id', index
ALTER TABLE "signals" ADD COLUMN IF NOT EXISTS "event_id" TEXT;

UPDATE "signals" SET "event_id" = "raw"->>'event_id' WHERE "event_id" IS NULL;

CREATE INDEX IF NOT EXISTS "signals_event_id" ON "signals"("event_id");
