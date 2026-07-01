/*
  Warnings:

  - You are about to drop the column `followUpChannel` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `followUpNextContactAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `followUpOwnerLabel` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `followUpReminder` on the `Lead` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "LeadFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "nextContactAt" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "ownerLabel" TEXT NOT NULL,
    "reminder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "budget" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "lossReasonId" TEXT,
    "lossReasonNote" TEXT,
    "totalScore" REAL,
    "reviewsCount" INTEGER,
    "city" TEXT,
    "state" TEXT,
    "url" TEXT,
    "website" TEXT,
    "googlePlaceId" TEXT,
    "categoryName" TEXT,
    "lastImportedAt" DATETIME,
    "lastManualUpdateAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_lossReasonId_fkey" FOREIGN KEY ("lossReasonId") REFERENCES "LossReason" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("budget", "categoryName", "city", "createdAt", "email", "googlePlaceId", "id", "lastImportedAt", "lastManualUpdateAt", "lossReasonId", "lossReasonNote", "name", "notes", "phone", "reviewsCount", "source", "state", "status", "totalScore", "updatedAt", "url", "website") SELECT "budget", "categoryName", "city", "createdAt", "email", "googlePlaceId", "id", "lastImportedAt", "lastManualUpdateAt", "lossReasonId", "lossReasonNote", "name", "notes", "phone", "reviewsCount", "source", "state", "status", "totalScore", "updatedAt", "url", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");
CREATE UNIQUE INDEX "Lead_googlePlaceId_key" ON "Lead"("googlePlaceId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_lossReasonId_idx" ON "Lead"("lossReasonId");
CREATE INDEX "Lead_lastImportedAt_idx" ON "Lead"("lastImportedAt");
CREATE INDEX "Lead_lastManualUpdateAt_idx" ON "Lead"("lastManualUpdateAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LeadFollowUp_leadId_key" ON "LeadFollowUp"("leadId");

-- CreateIndex
CREATE INDEX "LeadFollowUp_leadId_idx" ON "LeadFollowUp"("leadId");

-- CreateIndex
CREATE INDEX "LeadFollowUp_nextContactAt_idx" ON "LeadFollowUp"("nextContactAt");
