-- AlterTable: add delivery tracking (status, sentAt, deliveredAt, failedAt, errorMessage)
ALTER TABLE "notifications" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "notifications" ADD COLUMN "sent_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "delivered_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "failed_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "error_message" TEXT;

CREATE INDEX "notifications_status_idx" ON "notifications"("status");
