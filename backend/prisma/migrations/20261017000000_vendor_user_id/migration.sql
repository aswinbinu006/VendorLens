-- Step 1: Add user_id column to vendors table if it doesn't already exist
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "user_id" BIGINT;

-- Step 2: Add foreign key constraint to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_user_id_fkey'
  ) THEN
    ALTER TABLE "vendors"
      ADD CONSTRAINT "vendors_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Backfill existing vendors to the primary company account (so the 33 existing vendors stay with the original account)
UPDATE "vendors"
SET "user_id" = COALESCE(
  (SELECT "id" FROM "users" WHERE "email" = 'aswin.binu.batch2024@sitnagpur.siu.edu.in' LIMIT 1),
  (SELECT "id" FROM "users" WHERE "email" != 'admin@example.com' ORDER BY "id" ASC LIMIT 1),
  (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1)
)
WHERE "user_id" IS NULL;

-- Step 4: Drop old global unique constraint on normalized_name
ALTER TABLE "vendors" DROP CONSTRAINT IF EXISTS "vendors_normalized_name_key";

-- Step 5: Add index on user_id
CREATE INDEX IF NOT EXISTS "vendors_user_id" ON "vendors"("user_id");

-- Step 6: Create unique composite index on (user_id, normalized_name)
CREATE UNIQUE INDEX IF NOT EXISTS "vendors_user_normalized_name" ON "vendors"("user_id", "normalized_name");
