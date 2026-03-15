import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import { ReportDefinitionNotFoundError } from "../errors";

export class GetReportDefinitionUseCase {
  constructor(private readonly reportDefinitionRepository: IReportDefinitionRepository) {}

  async execute(id: string) {
    const report = await this.reportDefinitionRepository.findById(id);
    if (!report) throw new ReportDefinitionNotFoundError(id);
    return report;
  }
}
