import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestReportExportUseCase } from "./request-report-export.use-case";
import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";

describe("RequestReportExportUseCase", () => {
  let exportJobRepository: IReportExportJobRepository;
  let reportDefinitionRepository: IReportDefinitionRepository;

  beforeEach(() => {
    exportJobRepository = {
      create: vi.fn().mockResolvedValue({
        id: "job-1",
        requestedById: "user-1",
        reportType: null,
        filters: {},
        status: "pending",
        format: "csv",
        fileContent: null,
        fileName: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      findById: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };
    reportDefinitionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
    } as unknown as IReportDefinitionRepository;
  });

  it("queues and processes export jobs", async () => {
    const useCase = new RequestReportExportUseCase(exportJobRepository, reportDefinitionRepository);

    const result = await useCase.execute({
      requestedById: "user-1",
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(result.id).toBe("job-1");
    expect(exportJobRepository.updateStatus).toHaveBeenCalledWith("job-1", "processing");
    expect(exportJobRepository.updateStatus).toHaveBeenCalledWith(
      "job-1",
      "completed",
      expect.objectContaining({
        fileContent: "id,name,description,reportType,filters,createdAt,updatedAt",
      })
    );
  });

  it("marks job as failed when background processing times out", async () => {
    vi.mocked(reportDefinitionRepository.list).mockReturnValue(new Promise(() => undefined));
    const useCase = new RequestReportExportUseCase(exportJobRepository, reportDefinitionRepository, {
      exportJobTimeoutMs: 10,
    });

    await useCase.execute({
      requestedById: "user-1",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(exportJobRepository.updateStatus).toHaveBeenCalledWith(
      "job-1",
      "failed",
      expect.objectContaining({
        errorMessage: "Export processing timed out",
      })
    );
  });
});
