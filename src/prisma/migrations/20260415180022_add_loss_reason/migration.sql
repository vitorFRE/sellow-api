-- CreateTable
CREATE TABLE "LossReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_lossReasonId_fkey" FOREIGN KEY ("lossReasonId") REFERENCES "LossReason" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("budget", "categoryName", "city", "createdAt", "email", "googlePlaceId", "id", "name", "phone", "reviewsCount", "source", "state", "status", "totalScore", "updatedAt", "url", "website") SELECT "budget", "categoryName", "city", "createdAt", "email", "googlePlaceId", "id", "name", "phone", "reviewsCount", "source", "state", "status", "totalScore", "updatedAt", "url", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");
CREATE UNIQUE INDEX "Lead_googlePlaceId_key" ON "Lead"("googlePlaceId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_lossReasonId_idx" ON "Lead"("lossReasonId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LossReason_name_key" ON "LossReason"("name");
