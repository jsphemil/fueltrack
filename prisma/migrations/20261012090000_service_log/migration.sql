-- Service log: items to service (by km and/or months) and service records.
-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intervalKm" INTEGER,
    "intervalMonths" INTEGER,
    "baselineOdometer" INTEGER NOT NULL,
    "baselineDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "occurredOn" DATE NOT NULL,
    "odometer" INTEGER NOT NULL,
    "costPaise" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRecordItem" (
    "recordId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ServiceRecordItem_pkey" PRIMARY KEY ("recordId","itemId")
);

-- CreateIndex
CREATE INDEX "ServiceItem_vehicleId_idx" ON "ServiceItem"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceRecord_vehicleId_occurredOn_idx" ON "ServiceRecord"("vehicleId", "occurredOn");

-- CreateIndex
CREATE INDEX "ServiceRecordItem_itemId_idx" ON "ServiceRecordItem"("itemId");

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecordItem" ADD CONSTRAINT "ServiceRecordItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRecordItem" ADD CONSTRAINT "ServiceRecordItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Only the app's server (Prisma) reads these tables; block Supabase's public REST API.
ALTER TABLE "ServiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceRecordItem" ENABLE ROW LEVEL SECURITY;

-- Carry over existing oil change reminders as an "Engine oil" item.
INSERT INTO "ServiceItem" ("id", "userId", "vehicleId", "name", "intervalKm", "baselineOdometer", "baselineDate")
SELECT gen_random_uuid()::text, "userId", "id", 'Engine oil', "serviceIntervalKm",
       COALESCE("lastServiceOdometer", "startOdometer"), CURRENT_DATE
FROM "Vehicle"
WHERE "serviceIntervalKm" IS NOT NULL;
