import {
  ReportExportJobForbiddenError,
  ReportExportJobNotFoundError,
  ReportExportJobNotReadyError,
} from "../errors";
import type { IReportExportJobRepository } from "../ports/report-export-job-repository.port";
import type { ReportExportJobAccessContext } from "./get-report-export-job.use-case";

export class DownloadReportExportJobUseCase {
  constructor(private readonly exportJobRepository: IReportExportJobRepository) {}

  async execute(
    id: string,
    access: ReportExportJobAccessContext
  ): Promise<{ fileName: string; content: string }> {
    const job = await this.exportJobRepository.findById(id);
    if (!job) throw new ReportExportJobNotFoundError(id);
    if (!access.canAccessAll && job.requestedById !== access.requesterId) {
      throw new ReportExportJobForbiddenError();
    }
    if (job.status !== "completed" || !job.fileContent || !job.fileName) {
      throw new ReportExportJobNotReadyError(id, job.status);
    }
    return { fileName: job.fileName, content: job.fileContent };
  }
}
