-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "latitude" REAL;
ALTER TABLE "Lead" ADD COLUMN "longitude" REAL;

-- CreateIndex
CREATE INDEX "Lead_workspaceId_latitude_longitude_idx" ON "Lead"("workspaceId", "latitude", "longitude");
