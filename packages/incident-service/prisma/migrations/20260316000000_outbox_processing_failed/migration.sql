-- AlterTable
ALTER TABLE "outbox" ADD COLUMN "processing_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3),
ADD COLUMN "terminal_error" TEXT;

-- CreateIndex
CREATE INDEX "outbox_processing_at_idx" ON "outbox"("processing_at");
CREATE INDEX "outbox_failed_at_idx" ON "outbox"("failed_at");
