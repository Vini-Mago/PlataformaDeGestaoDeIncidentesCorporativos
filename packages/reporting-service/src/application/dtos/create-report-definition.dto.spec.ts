import { describe, it, expect } from "vitest";
import { createReportDefinitionSchema } from "./create-report-definition.dto";

describe("createReportDefinitionSchema", () => {
  it("accepts valid payload", () => {
    const result = createReportDefinitionSchema.safeParse({
      name: "Incidents summary",
      reportType: "incidents_summary",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toEqual({});
    }
  });

  it("accepts payload with filters", () => {
    const result = createReportDefinitionSchema.safeParse({
      name: "KPI",
      reportType: "kpi_dashboard",
      filters: { period: "month" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toEqual({ period: "month" });
    }
  });

  it("rejects missing name", () => {
    const result = createReportDefinitionSchema.safeParse({
      reportType: "incidents_summary",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reportType", () => {
    const result = createReportDefinitionSchema.safeParse({
      name: "Report",
      reportType: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});
