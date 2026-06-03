import { describe, it, expect } from "vitest";
import { ExecutiveKpiCalculator, type IncidentData } from "./executive-kpi-calculator";

describe("ExecutiveKpiCalculator", () => {
  it("returns empty groupings when no incidents are provided", () => {
    const result = ExecutiveKpiCalculator.calculate([]);
    expect(result.byService).toEqual({});
    expect(result.byTeam).toEqual({});
    expect(result.byCriticality).toEqual({});
  });

  it("calculates MTTR and MTBF for a single unresolved incident", () => {
    const incidents: IncidentData[] = [
      {
        createdAt: new Date("2026-05-01T10:00:00Z"),
        resolvedAt: null,
        serviceAffected: "Billing",
        assignedTeamId: "Team-Alpha",
        criticality: "High",
      },
    ];

    const result = ExecutiveKpiCalculator.calculate(incidents);

    expect(result.byService["Billing"]).toEqual({
      totalIncidents: 1,
      resolvedIncidents: 0,
      mttrHours: 0,
      mtbfHours: 0,
    });

    expect(result.byTeam["Team-Alpha"]).toEqual({
      totalIncidents: 1,
      resolvedIncidents: 0,
      mttrHours: 0,
      mtbfHours: 0,
    });

    expect(result.byCriticality["High"]).toEqual({
      totalIncidents: 1,
      resolvedIncidents: 0,
      mttrHours: 0,
      mtbfHours: 0,
    });
  });

  it("calculates MTTR and MTBF for a single resolved incident", () => {
    const incidents: IncidentData[] = [
      {
        createdAt: new Date("2026-05-01T10:00:00Z"),
        resolvedAt: new Date("2026-05-01T12:30:00Z"), // 2.5 hours resolution time
        serviceAffected: "Billing",
        assignedTeamId: "Team-Alpha",
        criticality: "High",
      },
    ];

    const result = ExecutiveKpiCalculator.calculate(incidents);

    expect(result.byService["Billing"]).toEqual({
      totalIncidents: 1,
      resolvedIncidents: 1,
      mttrHours: 2.5,
      mtbfHours: 0,
    });
  });

  it("calculates MTTR and MTBF correctly with multiple incidents", () => {
    const incidents: IncidentData[] = [
      {
        createdAt: new Date("2026-05-01T10:00:00Z"),
        resolvedAt: new Date("2026-05-01T12:00:00Z"), // 2 hours
        serviceAffected: "Database",
        assignedTeamId: "DB-Team",
        criticality: "Critical",
      },
      {
        createdAt: new Date("2026-05-02T10:00:00Z"), // Exactly 24 hours later
        resolvedAt: new Date("2026-05-02T14:00:00Z"), // 4 hours
        serviceAffected: "Database",
        assignedTeamId: "DB-Team",
        criticality: "Critical",
      },
      {
        createdAt: new Date("2026-05-04T10:00:00Z"), // Exactly 48 hours after second incident
        resolvedAt: null, // Unresolved
        serviceAffected: "Database",
        assignedTeamId: "DB-Team",
        criticality: "Critical",
      },
    ];

    const result = ExecutiveKpiCalculator.calculate(incidents);

    // MTTR calculation:
    // Resolved incidents: 2 (2 hours + 4 hours)
    // Avg Repair Time: 3 hours
    // MTBF calculation:
    // Failures: 3
    // Consecutive Intervals:
    // - Incident 1 to 2: 24 hours
    // - Incident 2 to 3: 48 hours
    // Total Interval sum = 72 hours
    // Count = 3 - 1 = 2 intervals
    // Avg Interval (MTBF): 72 / 2 = 36 hours
    expect(result.byService["Database"]).toEqual({
      totalIncidents: 3,
      resolvedIncidents: 2,
      mttrHours: 3.0,
      mtbfHours: 36.0,
    });
  });

  it("groups metrics independently by service, team, and criticality", () => {
    const incidents: IncidentData[] = [
      {
        createdAt: new Date("2026-05-01T10:00:00Z"),
        resolvedAt: new Date("2026-05-01T11:00:00Z"), // 1 hour
        serviceAffected: "Auth",
        assignedTeamId: "Team-A",
        criticality: "Medium",
      },
      {
        createdAt: new Date("2026-05-01T12:00:00Z"),
        resolvedAt: new Date("2026-05-01T14:00:00Z"), // 2 hours
        serviceAffected: "Billing",
        assignedTeamId: "Team-B",
        criticality: "High",
      },
    ];

    const result = ExecutiveKpiCalculator.calculate(incidents);

    expect(result.byService["Auth"].mttrHours).toBe(1);
    expect(result.byService["Billing"].mttrHours).toBe(2);

    expect(result.byTeam["Team-A"].mttrHours).toBe(1);
    expect(result.byTeam["Team-B"].mttrHours).toBe(2);

    expect(result.byCriticality["Medium"].mttrHours).toBe(1);
    expect(result.byCriticality["High"].mttrHours).toBe(2);
  });
});
