-- RF-7.1: um incidente liga-se no máximo a um problema.

CREATE UNIQUE INDEX "problem_linked_incidents_incident_id_key" ON "problem_linked_incidents"("incident_id");
