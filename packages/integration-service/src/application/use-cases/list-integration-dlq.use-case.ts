import type {
  IIntegrationDlqRepository,
  IntegrationDlqStatus,
} from "../ports/integration-dlq-repository.port";

export interface ListIntegrationDlqQuery {
  status?: IntegrationDlqStatus;
  limit?: number;
}

export function parseIntegrationDlqStatus(raw: unknown): IntegrationDlqStatus {
  if (raw === "pending" || raw === "reprocessed" || raw === "all") return raw;
  if (raw == null || raw === "") return "pending";
  throw new Error("Invalid DLQ status filter");
}

export class ListIntegrationDlqUseCase {
  constructor(private readonly integrationDlqRepository: IIntegrationDlqRepository) {}

  execute(query: ListIntegrationDlqQuery = {}) {
    return this.integrationDlqRepository.list(query);
  }
}
