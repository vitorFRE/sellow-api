/*
  Warnings:

  - A unique constraint covering the columns `[googlePlaceId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_googlePlaceId_key" ON "Lead"("googlePlaceId");
