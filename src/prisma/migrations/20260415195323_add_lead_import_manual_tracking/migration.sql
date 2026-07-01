-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "lastImportedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "lastManualUpdateAt" DATETIME;

-- CreateIndex
CREATE INDEX "Lead_lastImportedAt_idx" ON "Lead"("lastImportedAt");

-- CreateIndex
CREATE INDEX "Lead_lastManualUpdateAt_idx" ON "Lead"("lastManualUpdateAt");
