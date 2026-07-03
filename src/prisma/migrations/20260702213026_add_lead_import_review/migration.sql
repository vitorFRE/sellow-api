-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "importReview" TEXT;

-- CreateIndex
CREATE INDEX "Lead_importReview_idx" ON "Lead"("importReview");
