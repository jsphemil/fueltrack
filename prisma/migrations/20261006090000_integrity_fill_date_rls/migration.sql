-- Vehicle type: backfill and enforce the schema's NOT NULL default
UPDATE "Vehicle" SET "vehicleType" = 'Unknown' WHERE "vehicleType" IS NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" SET DEFAULT 'Unknown';
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" SET NOT NULL;

-- Fill date: user-editable date of the fill, backfilled from the save time
ALTER TABLE "FuelEntry" ADD COLUMN "filled_at" TIMESTAMP(3);
UPDATE "FuelEntry" SET "filled_at" = "created_at";
ALTER TABLE "FuelEntry" ALTER COLUMN "filled_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FuelEntry" ALTER COLUMN "filled_at" SET NOT NULL;

CREATE INDEX "FuelEntry_userId_vehicleId_filled_at_idx" ON "FuelEntry"("userId", "vehicleId", "filled_at");

-- Cascade deletes from user and vehicle
ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "Vehicle_userId_fkey";
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FuelEntry" DROP CONSTRAINT IF EXISTS "FuelEntry_vehicleId_fkey";
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_userId_fkey";
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row level security: tables are only accessed through the app's server
-- (Prisma), so block Supabase's public REST API by enabling RLS without policies.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FuelEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
