CREATE TABLE "report_export_jobs" (
  "id" UUID PRIMARY KEY,
  "requested_by_id" TEXT NOT NULL,
  "report_type" TEXT,
  "filters" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "file_content" TEXT,
  "file_name" TEXT,
  "error_message" TEXT,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "report_export_jobs_status_created_at_idx"
  ON "report_export_jobs" ("status", "created_at");

CREATE INDEX "report_export_jobs_requested_by_id_created_at_idx"
  ON "report_export_jobs" ("requested_by_id", "created_at");
