-- Service visits get a type (maintenance or repair); issues track problems until a visit fixes them.
-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'MAINTENANCE';

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notedOn" DATE NOT NULL,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_vehicleId_idx" ON "Issue"("vehicleId");

-- CreateIndex
CREATE INDEX "Issue_recordId_idx" ON "Issue"("recordId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ServiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Only the app's server (Prisma) reads this table; block Supabase's public REST API.
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
