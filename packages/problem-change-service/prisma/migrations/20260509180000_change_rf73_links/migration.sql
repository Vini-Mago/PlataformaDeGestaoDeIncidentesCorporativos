-- RF-7.3: vínculos de mudança a incidentes e problemas motivadores

CREATE TABLE "change_linked_incidents" (
    "id" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_linked_incidents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "change_linked_incidents_change_id_incident_id_key" ON "change_linked_incidents"("change_id", "incident_id");
CREATE INDEX "change_linked_incidents_incident_id_idx" ON "change_linked_incidents"("incident_id");

ALTER TABLE "change_linked_incidents" ADD CONSTRAINT "change_linked_incidents_change_id_fkey" FOREIGN KEY ("change_id") REFERENCES "changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "change_linked_problems" (
    "id" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_linked_problems_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "change_linked_problems_change_id_problem_id_key" ON "change_linked_problems"("change_id", "problem_id");
CREATE INDEX "change_linked_problems_problem_id_idx" ON "change_linked_problems"("problem_id");

ALTER TABLE "change_linked_problems" ADD CONSTRAINT "change_linked_problems_change_id_fkey" FOREIGN KEY ("change_id") REFERENCES "changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "change_linked_problems" ADD CONSTRAINT "change_linked_problems_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
