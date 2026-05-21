import type { IIntegrationDlqRepository } from "../ports/integration-dlq-repository.port";
import type { IOutboxWriter } from "../ports/outbox-writer.port";
import { IntegrationDlqAlreadyReprocessedError, IntegrationDlqNotFoundError } from "../errors";

export interface ReprocessIntegrationDlqResult {
  id: string;
  eventName: string;
  reprocessedAt: Date;
}

export class ReprocessIntegrationDlqUseCase {
  constructor(
    private readonly integrationDlqRepository: IIntegrationDlqRepository,
    private readonly outboxWriter: IOutboxWriter
  ) {}

  async execute(id: string): Promise<ReprocessIntegrationDlqResult> {
    const dlqItem = await this.integrationDlqRepository.findById(id);
    if (!dlqItem) {
      throw new IntegrationDlqNotFoundError(id);
    }
    if (dlqItem.reprocessedAt) {
      throw new IntegrationDlqAlreadyReprocessedError(id);
    }

    await this.outboxWriter.enqueue(dlqItem.eventName, {
      ...dlqItem.payload,
      reprocessedFromDlqId: dlqItem.id,
      reprocessedAt: new Date().toISOString(),
    });

    const reprocessedAt = new Date();
    await this.integrationDlqRepository.markReprocessed(id, reprocessedAt);
    return { id, eventName: dlqItem.eventName, reprocessedAt };
  }
}
