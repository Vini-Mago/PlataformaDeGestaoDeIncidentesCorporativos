import { ReportExportJobForbiddenError, ReportExportJobNotFoundError } from "../errors";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";

export interface ReportExportJobAccessContext {
  requesterId: string;
  canAccessAll: boolean;
}

export class GetReportExportJobUseCase {
  constructor(private readonly exportJobRepository: IReportExportJobRepository) {}

  async execute(id: string, access: ReportExportJobAccessContext) {
    const job = await this.exportJobRepository.findById(id);
    if (!job) throw new ReportExportJobNotFoundError(id);
    if (!access.canAccessAll && job.requestedById !== access.requesterId) {
      throw new ReportExportJobForbiddenError();
    }
    return {
      id: job.id,
      status: job.status,
      format: job.format,
      fileName: job.fileName,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }
}
