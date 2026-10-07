-- Low-fuel reminder threshold in km; NULL means reminders are off.
ALTER TABLE "User" ADD COLUMN "lowFuelKm" INTEGER;
