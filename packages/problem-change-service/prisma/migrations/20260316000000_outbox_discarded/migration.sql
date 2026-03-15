-- AlterTable
ALTER TABLE "outbox" ADD COLUMN "discarded_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "outbox_discarded_at_idx" ON "outbox"("discarded_at");
