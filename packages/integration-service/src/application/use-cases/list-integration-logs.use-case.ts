import type { IIntegrationLogRepository } from "../ports/integration-log-repository.port";

export class ListIntegrationLogsUseCase {
  constructor(private readonly integrationLogRepository: IIntegrationLogRepository) {}

  execute(limit?: number) {
    return this.integrationLogRepository.list(limit);
  }
}
