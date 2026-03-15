-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ticket_type" TEXT NOT NULL,
    "condition_type" TEXT NOT NULL,
    "condition_value" TEXT NOT NULL,
    "actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_history" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "ticket_type" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "action_executed" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escalation_rules_ticket_type_is_active_idx" ON "escalation_rules"("ticket_type", "is_active");

-- CreateIndex
CREATE INDEX "escalation_history_rule_id_idx" ON "escalation_history"("rule_id");

-- CreateIndex
CREATE INDEX "escalation_history_ticket_id_ticket_type_idx" ON "escalation_history"("ticket_id", "ticket_type");

-- CreateIndex
CREATE INDEX "escalation_history_triggered_at_idx" ON "escalation_history"("triggered_at");

-- AddForeignKey
ALTER TABLE "escalation_history" ADD CONSTRAINT "escalation_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "escalation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
