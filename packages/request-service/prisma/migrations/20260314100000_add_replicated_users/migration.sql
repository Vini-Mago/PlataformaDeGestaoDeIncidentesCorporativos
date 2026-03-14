-- PII: Columns "email" and "name" are sensitive (GDPR/CCPA). Application code must not log or
-- expose them in error messages; restrict access to roles that need read/write; consider
-- audit logging and retention policy for this table.
-- CreateTable
CREATE TABLE "replicated_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_event_occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replicated_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "replicated_users_email_idx" ON "replicated_users"("email");
