-- AlterTable
ALTER TABLE "outbox" ADD COLUMN "claimed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "outbox_claimed_at_idx" ON "outbox"("claimed_at");
