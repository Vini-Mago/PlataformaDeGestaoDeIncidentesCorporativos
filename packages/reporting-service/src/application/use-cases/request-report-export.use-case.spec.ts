import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestReportExportUseCase } from "./request-report-export.use-case";
import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { IIncidentProvider } from "../ports/incident-provider.port";

describe("RequestReportExportUseCase", () => {
  let exportJobRepository: IReportExportJobRepository;
  let reportDefinitionRepository: IReportDefinitionRepository;
  let incidentProvider: IIncidentProvider;

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
    incidentProvider = {
      fetchIncidents: vi.fn().mockResolvedValue([
        {
          createdAt: new Date("2026-05-01T10:00:00Z"),
          resolvedAt: new Date("2026-05-01T12:00:00Z"), // 2 hours MTTR
          serviceAffected: "AuthService",
          assignedTeamId: "Team-A",
          criticality: "High",
        },
      ]),
    };
  });

  it("queues and processes export jobs", async () => {
    const useCase = new RequestReportExportUseCase(
      exportJobRepository,
      reportDefinitionRepository,
      incidentProvider
    );

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
    const useCase = new RequestReportExportUseCase(
      exportJobRepository,
      reportDefinitionRepository,
      incidentProvider,
      {
        exportJobTimeoutMs: 10,
      }
    );

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

  it("calculates MTTR/MTBF and exports CSV content for kpi_dashboard report type", async () => {
    const useCase = new RequestReportExportUseCase(
      exportJobRepository,
      reportDefinitionRepository,
      incidentProvider
    );

    const result = await useCase.execute({
      requestedById: "user-1",
      reportType: "kpi_dashboard",
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(result.id).toBe("job-1");
    expect(incidentProvider.fetchIncidents).toHaveBeenCalled();
    expect(exportJobRepository.updateStatus).toHaveBeenCalledWith("job-1", "processing");
    expect(exportJobRepository.updateStatus).toHaveBeenCalledWith(
      "job-1",
      "completed",
      expect.objectContaining({
        fileContent: expect.stringContaining("--- METRICS BY SERVICE ---"),
        fileName: expect.stringMatching(/^executive-kpi-report-\d+\.csv$/),
      })
    );

    // Verify CSV content format
    const calls = vi.mocked(exportJobRepository.updateStatus).mock.calls;
    const completedCall = calls.find((c) => c[1] === "completed");
    expect(completedCall).toBeDefined();
    const payload = completedCall![2] as { fileContent: string };
    expect(payload.fileContent).toContain('"AuthService","1","1","2","0"');
    expect(payload.fileContent).toContain("--- METRICS BY ASSIGNED TEAM ---");
    expect(payload.fileContent).toContain('"Team-A","1","1","2","0"');
    expect(payload.fileContent).toContain("--- METRICS BY CRITICALITY ---");
    expect(payload.fileContent).toContain('"High","1","1","2","0"');
  });
});
