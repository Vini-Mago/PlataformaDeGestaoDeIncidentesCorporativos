import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { ReportExportJob } from "../../domain/entities/report-export-job.entity";

function csvEscape(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function reportDefinitionsToCsv(
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    reportType: string;
    filters: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }>
): string {
  const header = ["id", "name", "description", "reportType", "filters", "createdAt", "updatedAt"];
  const rows = items.map((item) =>
    [
      item.id,
      item.name,
      item.description,
      item.reportType,
      JSON.stringify(item.filters),
      item.createdAt,
      item.updatedAt,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export class RequestReportExportUseCase {
  constructor(
    private readonly exportJobRepository: IReportExportJobRepository,
    private readonly reportDefinitionRepository: IReportDefinitionRepository
  ) {}

  async execute(input: {
    requestedById: string;
    reportType?: string;
  }): Promise<Pick<ReportExportJob, "id" | "status" | "createdAt">> {
    const job = await this.exportJobRepository.create({
      requestedById: input.requestedById,
      reportType: input.reportType ?? null,
      filters: {
        reportType: input.reportType ?? null,
      },
      format: "csv",
    });

    void this.processInBackground(job.id, input.reportType).catch(async (err) => {
      await this.exportJobRepository.updateStatus(job.id, "failed", {
        errorMessage: err instanceof Error ? err.message : "Unknown export error",
        completedAt: new Date(),
      });
    });

    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  private async processInBackground(jobId: string, reportType?: string): Promise<void> {
    await this.exportJobRepository.updateStatus(jobId, "processing");
    const list = await this.reportDefinitionRepository.list({
      reportType: reportType ?? undefined,
    });
    const content = reportDefinitionsToCsv(list);
    await this.exportJobRepository.updateStatus(jobId, "completed", {
      fileContent: content,
      fileName: `report-definitions-${Date.now()}.csv`,
      errorMessage: null,
      completedAt: new Date(),
    });
  }
}
