import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetReportExportJobUseCase } from "./get-report-export-job.use-case";
import { ReportExportJobForbiddenError, ReportExportJobNotFoundError } from "../errors";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { ReportExportJob } from "../../domain/entities/report-export-job.entity";

describe("GetReportExportJobUseCase", () => {
  let exportJobRepository: IReportExportJobRepository;
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const otherUserId = "22222222-2222-2222-2222-222222222222";
  const jobId = "33333333-3333-3333-3333-333333333333";
  const now = new Date("2026-05-27T12:00:00.000Z");
  const mockJob: ReportExportJob = {
    id: jobId,
    requestedById: ownerId,
    reportType: "kpi_dashboard",
    filters: { reportType: "kpi_dashboard" },
    status: "completed",
    format: "csv",
    fileContent: "id,name\n1,Report",
    fileName: "report-definitions.csv",
    errorMessage: null,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    exportJobRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockJob),
      updateStatus: vi.fn(),
    };
  });

  it("returns the job metadata for the owner without exposing fileContent", async () => {
    const useCase = new GetReportExportJobUseCase(exportJobRepository);

    const result = await useCase.execute(jobId, {
      requesterId: ownerId,
      canAccessAll: false,
    });

    expect(result).toEqual({
      id: jobId,
      status: "completed",
      format: "csv",
      fileName: "report-definitions.csv",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    expect(result).not.toHaveProperty("fileContent");
    expect(exportJobRepository.findById).toHaveBeenCalledWith(jobId);
  });

  it("returns the job metadata for an administrative export-all requester", async () => {
    const useCase = new GetReportExportJobUseCase(exportJobRepository);

    const result = await useCase.execute(jobId, {
      requesterId: otherUserId,
      canAccessAll: true,
    });

    expect(result.id).toBe(jobId);
  });

  it("throws ReportExportJobForbiddenError for a non-owner without export-all access", async () => {
    const useCase = new GetReportExportJobUseCase(exportJobRepository);

    await expect(
      useCase.execute(jobId, {
        requesterId: otherUserId,
        canAccessAll: false,
      })
    ).rejects.toThrow(ReportExportJobForbiddenError);
  });

  it("throws ReportExportJobNotFoundError when the job does not exist", async () => {
    vi.mocked(exportJobRepository.findById).mockResolvedValue(null);
    const useCase = new GetReportExportJobUseCase(exportJobRepository);

    await expect(
      useCase.execute(jobId, {
        requesterId: ownerId,
        canAccessAll: false,
      })
    ).rejects.toThrow(ReportExportJobNotFoundError);
  });
});
