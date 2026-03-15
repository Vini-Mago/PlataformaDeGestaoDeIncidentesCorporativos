import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ListReportDefinitionsUseCase,
  parseReportTypeFilter,
  parseReportTypeFilterOrThrow,
} from "./list-report-definitions.use-case";
import { InvalidReportTypeError } from "../errors";
import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";

describe("ListReportDefinitionsUseCase", () => {
  let reportDefinitionRepository: IReportDefinitionRepository;

  beforeEach(() => {
    reportDefinitionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    };
  });

  it("lists reports with no filters", async () => {
    const useCase = new ListReportDefinitionsUseCase(reportDefinitionRepository);
    await useCase.execute({});
    expect(reportDefinitionRepository.list).toHaveBeenCalledWith({});
  });

  it("lists reports with reportType filter", async () => {
    const useCase = new ListReportDefinitionsUseCase(reportDefinitionRepository);
    await useCase.execute({ reportType: "kpi_dashboard" });
    expect(reportDefinitionRepository.list).toHaveBeenCalledWith({
      reportType: "kpi_dashboard",
    });
  });
});

describe("parseReportTypeFilter", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseReportTypeFilter(undefined)).toBeUndefined();
    expect(parseReportTypeFilter(null)).toBeUndefined();
  });

  it("returns trimmed string for valid report type", () => {
    expect(parseReportTypeFilter("incidents_summary")).toBe("incidents_summary");
    expect(parseReportTypeFilter("  kpi_dashboard  ")).toBe("kpi_dashboard");
  });

  it("returns undefined for empty string", () => {
    expect(parseReportTypeFilter("")).toBeUndefined();
  });
});

describe("parseReportTypeFilterOrThrow", () => {
  it("returns undefined for undefined or null", () => {
    expect(parseReportTypeFilterOrThrow(undefined)).toBeUndefined();
    expect(parseReportTypeFilterOrThrow(null)).toBeUndefined();
  });

  it("returns report type for valid strings", () => {
    expect(parseReportTypeFilterOrThrow("incidents_summary")).toBe("incidents_summary");
    expect(parseReportTypeFilterOrThrow("kpi_dashboard")).toBe("kpi_dashboard");
  });

  it("throws InvalidReportTypeError for invalid value", () => {
    expect(() => parseReportTypeFilterOrThrow("invalid")).toThrow(InvalidReportTypeError);
    expect(() => parseReportTypeFilterOrThrow("invalid")).toThrow(/Invalid report type/);
  });
});
