import type { IIncidentRepository } from "../ports/incident-repository.port";
import { logger } from "@pgic/shared";

export interface IntegrationIncidentIngestPayload {
  externalId: string;
  externalSource: string;
  title: string;
  description: string;
  criticality: string;
  serviceAffected?: string | null;
  requesterId: string;
  correlationId?: string | null;
}

export class HandleIntegrationIncidentIngestUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(payload: IntegrationIncidentIngestPayload) {
    const existing = await this.incidentRepository.findByExternalRef(
      payload.externalSource,
      payload.externalId
    );
    if (existing) {
      logger.info(
        {
          incidentId: existing.id,
          externalSource: payload.externalSource,
          externalId: payload.externalId,
          correlationId: payload.correlationId ?? null,
          decision: "replay_existing",
        },
        "integration ingest idempotent replay"
      );
      return { incident: existing, created: false as const };
    }

    const incident = await this.incidentRepository.create({
      title: payload.title,
      description: payload.description,
      criticality: payload.criticality,
      serviceAffected: payload.serviceAffected ?? null,
      requesterId: payload.requesterId,
      assignedTeamId: null,
      assignedToId: null,
      source: "integration",
      externalId: payload.externalId,
      externalSource: payload.externalSource,
      publishCreatedEvent: true,
    });

    logger.info(
      {
        incidentId: incident.id,
        externalSource: payload.externalSource,
        externalId: payload.externalId,
        correlationId: payload.correlationId ?? null,
        decision: "created_new",
      },
      "integration ingest incident created"
    );

    return { incident, created: true as const };
  }
}
