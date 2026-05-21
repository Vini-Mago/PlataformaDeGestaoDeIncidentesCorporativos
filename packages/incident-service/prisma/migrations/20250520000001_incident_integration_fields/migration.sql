-- AlterTable
ALTER TABLE "incidents" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "incidents" ADD COLUMN "external_id" TEXT;
ALTER TABLE "incidents" ADD COLUMN "external_source" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "incidents_external_source_external_id_key" ON "incidents"("external_source", "external_id");
