-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_entries_user_id_idx" ON "audit_entries"("user_id");

-- CreateIndex
CREATE INDEX "audit_entries_resource_type_resource_id_idx" ON "audit_entries"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_entries_created_at_idx" ON "audit_entries"("created_at");
