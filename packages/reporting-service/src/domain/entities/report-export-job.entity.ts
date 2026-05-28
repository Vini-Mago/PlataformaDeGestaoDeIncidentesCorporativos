export type ReportExportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface ReportExportJob {
  id: string;
  requestedById: string;
  reportType: string | null;
  filters: Record<string, unknown>;
  status: ReportExportJobStatus;
  format: "csv";
  fileContent: string | null;
  fileName: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
