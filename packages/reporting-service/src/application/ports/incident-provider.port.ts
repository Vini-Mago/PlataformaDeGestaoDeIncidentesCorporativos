import type { IncidentData } from "../../domain/services/executive-kpi-calculator";

export interface IIncidentProvider {
  fetchIncidents(): Promise<IncidentData[]>;
  disconnect?(): Promise<void>;
}
