import type { ReportExportJob, ReportExportJobStatus } from "../../domain/entities/report-export-job.entity";

export interface CreateReportExportJobInput {
  requestedById: string;
  reportType: string | null;
  filters: Record<string, unknown>;
  format: "csv";
}

export interface IReportExportJobRepository {
  create(input: CreateReportExportJobInput): Promise<ReportExportJob>;
  findById(id: string): Promise<ReportExportJob | null>;
  updateStatus(
    id: string,
    status: ReportExportJobStatus,
    patch?: {
      fileContent?: string | null;
      fileName?: string | null;
      errorMessage?: string | null;
      completedAt?: Date | null;
    }
  ): Promise<void>;
}
