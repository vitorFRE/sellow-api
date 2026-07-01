-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "followUpChannel" TEXT;
ALTER TABLE "Lead" ADD COLUMN "followUpNextContactAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "followUpOwnerLabel" TEXT;
ALTER TABLE "Lead" ADD COLUMN "followUpReminder" TEXT;
ALTER TABLE "Lead" ADD COLUMN "notes" TEXT;
