-- Oil-change reminder per vehicle. NULL interval means no reminder.
ALTER TABLE "Vehicle" ADD COLUMN "serviceIntervalKm" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "lastServiceOdometer" INTEGER;
