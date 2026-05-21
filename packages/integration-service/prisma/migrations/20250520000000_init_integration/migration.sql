-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "http_status" INTEGER,
    "correlation_id" TEXT,
    "external_id" TEXT,
    "payload_summary" JSONB,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_dlq" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error_message" TEXT NOT NULL,
    "reprocessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_dlq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "terminal_error" TEXT,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_logs_direction_idx" ON "integration_logs"("direction");

-- CreateIndex
CREATE INDEX "integration_logs_external_id_idx" ON "integration_logs"("external_id");

-- CreateIndex
CREATE INDEX "integration_logs_created_at_idx" ON "integration_logs"("created_at");

-- CreateIndex
CREATE INDEX "integration_dlq_reprocessed_at_idx" ON "integration_dlq"("reprocessed_at");

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "outbox"("published_at");

-- CreateIndex
CREATE INDEX "outbox_claimed_at_idx" ON "outbox"("claimed_at");

-- CreateIndex
CREATE INDEX "outbox_failed_at_idx" ON "outbox"("failed_at");
