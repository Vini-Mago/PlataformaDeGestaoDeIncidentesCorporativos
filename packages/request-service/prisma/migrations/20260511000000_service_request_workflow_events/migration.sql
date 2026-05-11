-- CreateTable
CREATE TABLE "service_request_workflow_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_workflow_events_request_id_idx" ON "service_request_workflow_events"("request_id");

-- AddForeignKey
ALTER TABLE "service_request_workflow_events" ADD CONSTRAINT "service_request_workflow_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
