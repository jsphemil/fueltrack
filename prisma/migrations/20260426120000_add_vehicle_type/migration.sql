-- Add vehicleType to Vehicle and backfill from legacy "type" values.
ALTER TABLE "Vehicle"
ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;

UPDATE "Vehicle"
SET "vehicleType" = COALESCE(NULLIF(TRIM("type"), ''), 'Unknown')
WHERE "vehicleType" IS NULL;

ALTER TABLE "Vehicle"
ALTER COLUMN "vehicleType" SET DEFAULT 'Unknown',
ALTER COLUMN "vehicleType" SET NOT NULL;

-- Optional cleanup of the legacy column once all reads/writes are migrated.
ALTER TABLE "Vehicle"
DROP COLUMN IF EXISTS "type";
