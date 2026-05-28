import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { ReportExportJob } from "../../domain/entities/report-export-job.entity";

const DEFAULT_EXPORT_JOB_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PENDING_JOBS = 200;

type ExportTask = { jobId: string; reportType?: string };

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
  private readonly pendingTasks: ExportTask[] = [];
  private running = false;

  constructor(
    private readonly exportJobRepository: IReportExportJobRepository,
    private readonly reportDefinitionRepository: IReportDefinitionRepository,
    private readonly config: { exportJobTimeoutMs?: number; maxPendingJobs?: number } = {}
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

    this.scheduleBackgroundProcessing(job.id, input.reportType);

    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  private scheduleBackgroundProcessing(jobId: string, reportType?: string): void {
    const maxPendingJobs = this.config.maxPendingJobs ?? DEFAULT_MAX_PENDING_JOBS;
    if (this.pendingTasks.length >= maxPendingJobs) {
      void this.exportJobRepository.updateStatus(jobId, "failed", {
        errorMessage: "Export queue is full. Please retry later.",
        completedAt: new Date(),
      });
      return;
    }
    this.pendingTasks.push({ jobId, reportType });
    if (!this.running) {
      this.running = true;
      void this.runQueue();
    }
  }

  private async runQueue(): Promise<void> {
    while (this.pendingTasks.length > 0) {
      const task = this.pendingTasks.shift();
      if (!task) continue;
      try {
        await this.processWithTimeout(task.jobId, task.reportType);
      } catch (err) {
        await this.exportJobRepository.updateStatus(task.jobId, "failed", {
          errorMessage: err instanceof Error ? err.message : "Unknown export error",
          completedAt: new Date(),
        });
      }
    }
    this.running = false;
  }

  private async processWithTimeout(jobId: string, reportType?: string): Promise<void> {
    const exportJobTimeoutMs = this.config.exportJobTimeoutMs ?? DEFAULT_EXPORT_JOB_TIMEOUT_MS;
    await Promise.race([
      this.processInBackground(jobId, reportType),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Export processing timed out")), exportJobTimeoutMs);
      }),
    ]);
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
