/*
  Warnings:

  - You are about to alter the column `importSummary` on the `IntegrationRun` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `input` on the `IntegrationRun` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntegrationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalRunId" TEXT,
    "externalActorId" TEXT,
    "datasetId" TEXT,
    "input" JSONB NOT NULL,
    "importSummary" JSONB,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IntegrationRun" ("createdAt", "createdById", "datasetId", "errorMessage", "externalActorId", "externalRunId", "finishedAt", "id", "importSummary", "input", "provider", "startedAt", "status", "type", "updatedAt", "workspaceId") SELECT "createdAt", "createdById", "datasetId", "errorMessage", "externalActorId", "externalRunId", "finishedAt", "id", "importSummary", "input", "provider", "startedAt", "status", "type", "updatedAt", "workspaceId" FROM "IntegrationRun";
DROP TABLE "IntegrationRun";
ALTER TABLE "new_IntegrationRun" RENAME TO "IntegrationRun";
CREATE INDEX "IntegrationRun_workspaceId_status_idx" ON "IntegrationRun"("workspaceId", "status");
CREATE INDEX "IntegrationRun_status_idx" ON "IntegrationRun"("status");
CREATE INDEX "IntegrationRun_workspaceId_type_idx" ON "IntegrationRun"("workspaceId", "type");
CREATE UNIQUE INDEX "IntegrationRun_provider_externalRunId_key" ON "IntegrationRun"("provider", "externalRunId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
