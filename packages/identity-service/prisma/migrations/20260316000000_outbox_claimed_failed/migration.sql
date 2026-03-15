-- AlterTable
ALTER TABLE "outbox" ADD COLUMN "claimed_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3),
ADD COLUMN "terminal_error" TEXT;

-- CreateIndex
CREATE INDEX "outbox_claimed_at_idx" ON "outbox"("claimed_at");
CREATE INDEX "outbox_failed_at_idx" ON "outbox"("failed_at");
