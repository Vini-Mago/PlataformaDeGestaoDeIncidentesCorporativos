import { describe, it, expect, vi, beforeEach } from "vitest";
import { DownloadReportExportJobUseCase } from "./download-report-export-job.use-case";
import {
  ReportExportJobForbiddenError,
  ReportExportJobNotFoundError,
  ReportExportJobNotReadyError,
} from "../errors";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { ReportExportJob } from "../../domain/entities/report-export-job.entity";

describe("DownloadReportExportJobUseCase", () => {
  let exportJobRepository: IReportExportJobRepository;
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const otherUserId = "22222222-2222-2222-2222-222222222222";
  const jobId = "33333333-3333-3333-3333-333333333333";
  const now = new Date("2026-05-27T12:00:00.000Z");
  const mockJob: ReportExportJob = {
    id: jobId,
    requestedById: ownerId,
    reportType: null,
    filters: { reportType: null },
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

  it("returns the file for the owner", async () => {
    const useCase = new DownloadReportExportJobUseCase(exportJobRepository);

    const result = await useCase.execute(jobId, {
      requesterId: ownerId,
      canAccessAll: false,
    });

    expect(result).toEqual({
      fileName: "report-definitions.csv",
      content: "id,name\n1,Report",
    });
  });

  it("returns the file for an administrative export-all requester", async () => {
    const useCase = new DownloadReportExportJobUseCase(exportJobRepository);

    const result = await useCase.execute(jobId, {
      requesterId: otherUserId,
      canAccessAll: true,
    });

    expect(result.fileName).toBe("report-definitions.csv");
  });

  it("throws ReportExportJobForbiddenError for a non-owner without export-all access", async () => {
    const useCase = new DownloadReportExportJobUseCase(exportJobRepository);

    await expect(
      useCase.execute(jobId, {
        requesterId: otherUserId,
        canAccessAll: false,
      })
    ).rejects.toThrow(ReportExportJobForbiddenError);
  });

  it("throws ReportExportJobNotReadyError when an owned job is not completed", async () => {
    vi.mocked(exportJobRepository.findById).mockResolvedValue({
      ...mockJob,
      status: "processing",
      fileContent: null,
      fileName: null,
    });
    const useCase = new DownloadReportExportJobUseCase(exportJobRepository);

    await expect(
      useCase.execute(jobId, {
        requesterId: ownerId,
        canAccessAll: false,
      })
    ).rejects.toThrow(ReportExportJobNotReadyError);
  });

  it("throws ReportExportJobNotFoundError when the job does not exist", async () => {
    vi.mocked(exportJobRepository.findById).mockResolvedValue(null);
    const useCase = new DownloadReportExportJobUseCase(exportJobRepository);

    await expect(
      useCase.execute(jobId, {
        requesterId: ownerId,
        canAccessAll: false,
      })
    ).rejects.toThrow(ReportExportJobNotFoundError);
  });
});
