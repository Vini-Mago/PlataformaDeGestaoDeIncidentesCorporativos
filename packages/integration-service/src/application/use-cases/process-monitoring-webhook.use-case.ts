import { INTEGRATION_INCIDENT_INGEST_EVENT } from "@pgic/shared";
import type { IIntegrationLogRepository } from "../ports/integration-log-repository.port";
import type { IOutboxWriter } from "../ports/outbox-writer.port";
import {
  mapSeverityToCriticality,
  type MonitoringWebhookBody,
} from "../dtos/monitoring-webhook.dto";

export interface ProcessMonitoringWebhookInput {
  body: MonitoringWebhookBody;
  correlationId?: string;
  systemUserId: string;
}

export interface ProcessMonitoringWebhookResult {
  accepted: true;
  externalId: string;
  logId: string;
}

export class ProcessMonitoringWebhookUseCase {
  constructor(
    private readonly integrationLogRepository: IIntegrationLogRepository,
    private readonly outboxWriter: IOutboxWriter
  ) {}

  async execute(input: ProcessMonitoringWebhookInput): Promise<ProcessMonitoringWebhookResult> {
    const criticality = mapSeverityToCriticality(input.body.severity, input.body.criticality);
    const externalSource = input.body.source ?? "monitoring";

    const log = await this.integrationLogRepository.create({
      direction: "inbound",
      endpoint: "/api/webhooks/v1/monitoring",
      httpStatus: 202,
      correlationId: input.correlationId ?? null,
      externalId: input.body.externalId,
      payloadSummary: {
        title: input.body.title,
        criticality,
        serviceAffected: input.body.serviceAffected ?? null,
        source: externalSource,
      },
    });

    await this.outboxWriter.enqueue(INTEGRATION_INCIDENT_INGEST_EVENT, {
      externalId: input.body.externalId,
      externalSource,
      title: input.body.title,
      description: input.body.description ?? input.body.title,
      criticality,
      serviceAffected: input.body.serviceAffected ?? null,
      requesterId: input.systemUserId,
      correlationId: input.correlationId ?? null,
      occurredAt: new Date().toISOString(),
    });

    return { accepted: true, externalId: input.body.externalId, logId: log.id };
  }
}
