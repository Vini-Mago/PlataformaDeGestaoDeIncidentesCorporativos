-- CreateTable
CREATE TABLE "sla_assignments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "response_deadline" TIMESTAMP(3) NOT NULL,
    "resolution_deadline" TIMESTAMP(3) NOT NULL,
    "clock_started_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "risk_emitted" BOOLEAN NOT NULL DEFAULT false,
    "response_breach_emitted" BOOLEAN NOT NULL DEFAULT false,
    "resolution_breach_emitted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sla_assignments_ticket_id_ticket_type_key" ON "sla_assignments"("ticket_id", "ticket_type");

-- CreateIndex
CREATE INDEX "sla_assignments_status_idx" ON "sla_assignments"("status");

-- CreateIndex
CREATE INDEX "sla_assignments_response_deadline_idx" ON "sla_assignments"("response_deadline");

-- CreateIndex
CREATE INDEX "sla_assignments_resolution_deadline_idx" ON "sla_assignments"("resolution_deadline");
