import type { IIncidentRepository } from "../ports/incident-repository.port";

export interface IntegrationIncidentIngestPayload {
  externalId: string;
  externalSource: string;
  title: string;
  description: string;
  criticality: string;
  serviceAffected?: string | null;
  requesterId: string;
}

export class HandleIntegrationIncidentIngestUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(payload: IntegrationIncidentIngestPayload) {
    const existing = await this.incidentRepository.findByExternalRef(
      payload.externalSource,
      payload.externalId
    );
    if (existing) {
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

    return { incident, created: true as const };
  }
}
