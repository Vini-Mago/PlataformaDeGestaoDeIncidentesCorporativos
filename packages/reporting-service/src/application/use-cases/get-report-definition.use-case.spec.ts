import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetReportDefinitionUseCase } from "./get-report-definition.use-case";
import { ReportDefinitionNotFoundError } from "../errors";
import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { ReportDefinition } from "../../domain/entities/report-definition.entity";

describe("GetReportDefinitionUseCase", () => {
  let reportDefinitionRepository: IReportDefinitionRepository;
  const reportId = "11111111-1111-1111-1111-111111111111";
  const mockReport: ReportDefinition = {
    id: reportId,
    name: "Report",
    description: null,
    reportType: "incidents_summary",
    filters: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    reportDefinitionRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockReport),
      list: vi.fn(),
    };
  });

  it("returns report when it exists", async () => {
    const useCase = new GetReportDefinitionUseCase(reportDefinitionRepository);
    const result = await useCase.execute(reportId);
    expect(result).toEqual(mockReport);
    expect(reportDefinitionRepository.findById).toHaveBeenCalledWith(reportId);
  });

  it("throws ReportDefinitionNotFoundError when report does not exist", async () => {
    vi.mocked(reportDefinitionRepository.findById).mockResolvedValue(null);
    const useCase = new GetReportDefinitionUseCase(reportDefinitionRepository);
    const missingId = "00000000-0000-0000-0000-000000000000";

    await expect(useCase.execute(missingId)).rejects.toThrow(ReportDefinitionNotFoundError);
    await expect(useCase.execute(missingId)).rejects.toThrow(`Report definition not found: ${missingId}`);
  });
});
