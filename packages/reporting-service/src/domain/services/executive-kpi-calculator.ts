export interface IncidentData {
  createdAt: Date;
  resolvedAt: Date | null;
  serviceAffected: string | null;
  assignedTeamId: string | null;
  criticality: string;
}

export interface KpiMetrics {
  totalIncidents: number;
  resolvedIncidents: number;
  mttrHours: number;
  mtbfHours: number;
}

export interface ExecutiveKpisGrouped {
  byService: Record<string, KpiMetrics>;
  byTeam: Record<string, KpiMetrics>;
  byCriticality: Record<string, KpiMetrics>;
}

export class ExecutiveKpiCalculator {
  static calculate(incidents: IncidentData[]): ExecutiveKpisGrouped {
    const byService: Record<string, IncidentData[]> = {};
    const byTeam: Record<string, IncidentData[]> = {};
    const byCriticality: Record<string, IncidentData[]> = {};

    // Grouping
    for (const incident of incidents) {
      const service = incident.serviceAffected || "Unknown Service";
      const team = incident.assignedTeamId || "Unassigned";
      const criticality = incident.criticality || "Low";

      if (!byService[service]) byService[service] = [];
      byService[service].push(incident);

      if (!byTeam[team]) byTeam[team] = [];
      byTeam[team].push(incident);

      if (!byCriticality[criticality]) byCriticality[criticality] = [];
      byCriticality[criticality].push(incident);
    }

    return {
      byService: this.calculateForGroups(byService),
      byTeam: this.calculateForGroups(byTeam),
      byCriticality: this.calculateForGroups(byCriticality),
    };
  }

  private static calculateForGroups(groups: Record<string, IncidentData[]>): Record<string, KpiMetrics> {
    const result: Record<string, KpiMetrics> = {};

    for (const [key, items] of Object.entries(groups)) {
      const totalIncidents = items.length;
      const resolvedItems = items.filter((item) => item.resolvedAt !== null);
      const resolvedIncidents = resolvedItems.length;

      // Calculate MTTR (Mean Time to Repair)
      let mttrHours = 0;
      if (resolvedIncidents > 0) {
        const totalRepairTimeMs = resolvedItems.reduce((sum, item) => {
          const repairTime = item.resolvedAt!.getTime() - item.createdAt.getTime();
          return sum + Math.max(0, repairTime);
        }, 0);
        const avgRepairTimeMs = totalRepairTimeMs / resolvedIncidents;
        mttrHours = parseFloat((avgRepairTimeMs / (1000 * 60 * 60)).toFixed(2));
      }

      // Calculate MTBF (Mean Time Between Failures)
      let mtbfHours = 0;
      if (totalIncidents >= 2) {
        // Sort by creation date ascending
        const sortedItems = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        let totalIntervalMs = 0;
        for (let i = 1; i < sortedItems.length; i++) {
          totalIntervalMs += sortedItems[i].createdAt.getTime() - sortedItems[i - 1].createdAt.getTime();
        }
        const avgIntervalMs = totalIntervalMs / (totalIncidents - 1);
        mtbfHours = parseFloat((avgIntervalMs / (1000 * 60 * 60)).toFixed(2));
      }

      result[key] = {
        totalIncidents,
        resolvedIncidents,
        mttrHours,
        mtbfHours,
      };
    }

    return result;
  }
}
