-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Default workspace for legacy data
INSERT INTO "Workspace" ("id", "name", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Sellow', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Redefine LossReason with workspaceId
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_LossReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LossReason_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_LossReason" ("id", "workspaceId", "name", "description", "createdAt", "updatedAt")
SELECT "id", '00000000-0000-4000-8000-000000000001', "name", "description", "createdAt", "updatedAt"
FROM "LossReason";

DROP TABLE "LossReason";
ALTER TABLE "new_LossReason" RENAME TO "LossReason";

CREATE UNIQUE INDEX "LossReason_workspaceId_name_key" ON "LossReason"("workspaceId", "name");
CREATE INDEX "LossReason_workspaceId_idx" ON "LossReason"("workspaceId");

-- Redefine Lead with workspaceId
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
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
    "importReview" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_lossReasonId_fkey" FOREIGN KEY ("lossReasonId") REFERENCES "LossReason" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Lead" (
    "id", "workspaceId", "name", "email", "phone", "budget", "status", "source",
    "lossReasonId", "lossReasonNote", "totalScore", "reviewsCount", "city", "state",
    "url", "website", "googlePlaceId", "categoryName", "lastImportedAt", "lastManualUpdateAt",
    "notes", "importReview", "createdAt", "updatedAt"
)
SELECT
    "id", '00000000-0000-4000-8000-000000000001', "name", "email", "phone", "budget", "status", "source",
    "lossReasonId", "lossReasonNote", "totalScore", "reviewsCount", "city", "state",
    "url", "website", "googlePlaceId", "categoryName", "lastImportedAt", "lastManualUpdateAt",
    "notes", "importReview", "createdAt", "updatedAt"
FROM "Lead";

DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";

CREATE UNIQUE INDEX "Lead_workspaceId_email_key" ON "Lead"("workspaceId", "email");
CREATE UNIQUE INDEX "Lead_workspaceId_phone_key" ON "Lead"("workspaceId", "phone");
CREATE UNIQUE INDEX "Lead_workspaceId_googlePlaceId_key" ON "Lead"("workspaceId", "googlePlaceId");
CREATE INDEX "Lead_workspaceId_idx" ON "Lead"("workspaceId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_lossReasonId_idx" ON "Lead"("lossReasonId");
CREATE INDEX "Lead_lastImportedAt_idx" ON "Lead"("lastImportedAt");
CREATE INDEX "Lead_lastManualUpdateAt_idx" ON "Lead"("lastManualUpdateAt");
CREATE INDEX "Lead_importReview_idx" ON "Lead"("importReview");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Migrate users to default workspace
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    '00000000-0000-4000-8000-000000000001',
    "id",
    CASE WHEN "role" = 'ADMIN' THEN 'OWNER' ELSE 'MEMBER' END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

-- Platform admins keep super-admin access
UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';

-- WorkspaceMember indexes
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
