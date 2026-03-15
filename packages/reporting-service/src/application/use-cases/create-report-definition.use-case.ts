import type { IReportDefinitionRepository } from "../ports/report-definition-repository.port";
import type { CreateReportDefinitionDto } from "../dtos/create-report-definition.dto";

export class CreateReportDefinitionUseCase {
  constructor(private readonly reportDefinitionRepository: IReportDefinitionRepository) {}

  async execute(dto: CreateReportDefinitionDto) {
    return this.reportDefinitionRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      reportType: dto.reportType,
      filters: dto.filters ?? {},
    });
  }
}
