import type { IIncidentRepository } from "../ports/incident-repository.port";
import type { CreateIncidentDto } from "../dtos/create-incident.dto";

export class CreateIncidentUseCase {
  constructor(private readonly incidentRepository: IIncidentRepository) {}

  async execute(dto: CreateIncidentDto, requesterId: string) {
    const incident = await this.incidentRepository.create({
      title: dto.title,
      description: dto.description,
      criticality: dto.criticality,
      serviceAffected: dto.serviceAffected ?? null,
      requesterId,
      assignedTeamId: null,
      assignedToId: null,
      publishCreatedEvent: true,
    });
    return incident;
  }
}
