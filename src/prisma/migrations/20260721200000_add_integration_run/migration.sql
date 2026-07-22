-- CreateTable
CREATE TABLE "IntegrationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalRunId" TEXT,
    "externalActorId" TEXT,
    "datasetId" TEXT,
    "input" JSON NOT NULL,
    "importSummary" JSON,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationRun_provider_externalRunId_key" ON "IntegrationRun"("provider", "externalRunId");

-- CreateIndex
CREATE INDEX "IntegrationRun_workspaceId_status_idx" ON "IntegrationRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "IntegrationRun_status_idx" ON "IntegrationRun"("status");

-- CreateIndex
CREATE INDEX "IntegrationRun_workspaceId_type_idx" ON "IntegrationRun"("workspaceId", "type");
