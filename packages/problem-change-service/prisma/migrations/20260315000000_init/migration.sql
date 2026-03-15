CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "root_cause" TEXT,
    "action_plan" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "problems_status_idx" ON "problems"("status");
CREATE INDEX "problems_created_at_idx" ON "problems"("created_at");
CREATE INDEX "problems_created_by_id_idx" ON "problems"("created_by_id");

CREATE TABLE "changes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "window_start" TIMESTAMP(3),
    "window_end" TIMESTAMP(3),
    "rollback_plan" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "changes_status_idx" ON "changes"("status");
CREATE INDEX "changes_created_at_idx" ON "changes"("created_at");
CREATE INDEX "changes_created_by_id_idx" ON "changes"("created_by_id");
CREATE INDEX "changes_risk_idx" ON "changes"("risk");

CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_published_at_idx" ON "outbox"("published_at");

CREATE TABLE "replicated_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_event_occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "replicated_users_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "replicated_users_email_idx" ON "replicated_users"("email");
