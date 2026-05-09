-- RF-7.1: vínculo problema ↔ N incidentes (IDs do incident-service).

CREATE TABLE "problem_linked_incidents" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_linked_incidents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "problem_linked_incidents_problem_id_incident_id_key" ON "problem_linked_incidents"("problem_id", "incident_id");

CREATE INDEX "problem_linked_incidents_incident_id_idx" ON "problem_linked_incidents"("incident_id");

ALTER TABLE "problem_linked_incidents" ADD CONSTRAINT "problem_linked_incidents_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
