-- RF-5.1: incident attachments with explicit metadata and bounded content.
CREATE TABLE "incident_attachments" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incident_attachments_incident_id_idx" ON "incident_attachments"("incident_id");

ALTER TABLE "incident_attachments"
    ADD CONSTRAINT "incident_attachments_incident_id_fkey"
    FOREIGN KEY ("incident_id") REFERENCES "incidents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
