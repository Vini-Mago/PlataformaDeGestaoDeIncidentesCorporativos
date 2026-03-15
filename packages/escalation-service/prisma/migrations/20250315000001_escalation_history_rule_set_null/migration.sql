-- AlterTable: preserve history when rule is deleted (SetNull instead of Cascade)
ALTER TABLE "escalation_history" DROP CONSTRAINT IF EXISTS "escalation_history_rule_id_fkey";
ALTER TABLE "escalation_history" ALTER COLUMN "rule_id" DROP NOT NULL;
ALTER TABLE "escalation_history" ADD CONSTRAINT "escalation_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "escalation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
