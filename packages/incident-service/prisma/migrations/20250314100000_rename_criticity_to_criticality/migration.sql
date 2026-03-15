-- Rename criticity to criticality (typo fix)
ALTER TABLE "incidents" RENAME COLUMN "criticity" TO "criticality";

-- Add default to outbox created_at for consistency
ALTER TABLE "outbox" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
