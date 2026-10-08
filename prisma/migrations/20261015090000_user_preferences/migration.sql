-- Per-user customisation (Home tiles, reminder timing). NULL means defaults.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferences" JSONB;

