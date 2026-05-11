-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "processing_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "terminal_error" TEXT,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "outbox"("published_at");

-- CreateIndex
CREATE INDEX "outbox_processing_at_idx" ON "outbox"("processing_at");

-- CreateIndex
CREATE INDEX "outbox_failed_at_idx" ON "outbox"("failed_at");
