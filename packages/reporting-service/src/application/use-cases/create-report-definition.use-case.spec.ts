import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateReportDefinitionUseCase } from "./create-report-definition.use-case";
import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { ReportDefinition } from "../../domain/entities/report-definition.entity";

describe("CreateReportDefinitionUseCase", () => {
  let reportDefinitionRepository: IReportDefinitionRepository;
  const mockReport: ReportDefinition = {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Incidents by period",
    description: "Monthly summary",
    reportType: "incidents_summary",
    filters: { period: "month" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    reportDefinitionRepository = {
      create: vi.fn().mockResolvedValue(mockReport),
      findById: vi.fn(),
      list: vi.fn(),
    };
  });

  it("creates report definition with required fields", async () => {
    const useCase = new CreateReportDefinitionUseCase(reportDefinitionRepository);
    const dto = {
      name: "Incidents by period",
      reportType: "incidents_summary" as const,
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockReport);
    expect(reportDefinitionRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      description: null,
      reportType: dto.reportType,
      filters: {},
    });
  });

  it("creates report definition with optional fields", async () => {
    const useCase = new CreateReportDefinitionUseCase(reportDefinitionRepository);
    const dto = {
      name: "KPI Dashboard",
      description: "Main KPIs",
      reportType: "kpi_dashboard" as const,
      filters: { period: "week", team: "support" },
    };

    await useCase.execute(dto);

    expect(reportDefinitionRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      description: "Main KPIs",
      reportType: dto.reportType,
      filters: { period: "week", team: "support" },
    });
  });
});
